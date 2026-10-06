import type { AuthDefinition } from "@w6w/types";
import { bearer, probe } from "./probe.ts";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * SavvyCal OAuth 2 (authorization code), for acting on behalf of other users.
 *
 * Verified on developers.savvycal.com/authentication (2026-10-06): authorize at
 * `https://savvycal.com/oauth/authorize`, token at `https://savvycal.com/oauth/token`
 * (form-encoded). Access tokens last 2 hours (`expires_in: 7200`) and are renewed
 * with the refresh token. The docs list no scopes and no PKCE.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with SavvyCal)",
  description:
    "Requires a SavvyCal OAuth application (Settings > Developers > Create an app) whose " +
    "client ID, secret and redirect URI are configured on this w6w installation.",
  connectionLabel: "SavvyCal ({{email}})",
  oauth2: {
    authorizationUrl: "https://savvycal.com/oauth/authorize",
    tokenUrl: "https://savvycal.com/oauth/token",
    scopes: [],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    for (const [k, v] of Object.entries(bearer(accessToken ?? ""))) request.headers[k] = v;
    return request;
  },

  async test({ credential }, ctx) {
    const accessToken = String((credential as { accessToken?: string })?.accessToken ?? "").trim();
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const result = await probe(ctx, accessToken);
    return result.ok ? { ok: true } : { ok: false, message: result.message };
  },

  async afterConnect(_input, ctx) {
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/me`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) return {};
      const me = await res.json() as { id?: string; email?: string };
      return { email: me.email, userId: me.id };
    } catch {
      return {};
    }
  },
};

export default oauth2;
