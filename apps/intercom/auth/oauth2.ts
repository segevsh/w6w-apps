import type { AuthDefinition } from "@w6w/types";
import { API_URL, INTERCOM_VERSION } from "../lib/client.ts";

/**
 * OAuth 2.0 with an Intercom app. The client_id / client_secret / redirect_uri
 * live on the w6w server, not in this package.
 *
 * Intercom scopes are configured on the app in the Developer Hub, NOT passed on
 * the authorize URL, so `scopes` is intentionally empty — widening access means
 * editing the app, not this file. The exchanged access token is a normal Bearer
 * token, identical on the wire to a personal access token.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Intercom)",
  description:
    "Public OAuth flow. Requires an Intercom app registered on this w6w installation with OAuth enabled.",
  connectionLabel: "{{admin.name}} ({{workspace.name}})",
  oauth2: {
    authorizationUrl: "https://app.intercom.com/oauth",
    tokenUrl: "https://api.intercom.io/auth/eagle/token",
    scopes: [],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/json",
        "intercom-version": INTERCOM_VERSION,
      },
    });
    if (!res.ok) return { ok: false, message: `Intercom returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { accept: "application/json", "intercom-version": INTERCOM_VERSION },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      name?: string;
      email?: string;
      app?: { name?: string; id_code?: string };
    };
    return { admin: { name: body.name, email: body.email }, workspace: body.app ?? {} };
  },
};

export default oauth2;
