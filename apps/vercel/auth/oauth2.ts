import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 (authorization-code grant) — Vercel's **Integration** flow. The
 * `client_id` / `client_secret` / `redirect_uri` live on the w6w server
 * (`PUT /apps/:id/oauth-config/oauth2`), not in this package; the integration
 * itself is registered in Vercel's Integration Console.
 *
 * Endpoints taken from Vercel's own OpenAPI document's `oauth2` security
 * scheme (https://openapi.vercel.sh/, fetched 2026-08-18) and confirmed live
 * on the same day:
 *
 *   GET  https://api.vercel.com/oauth/authorize?client_id=test&response_type=code
 *        → 302 to https://vercel.com/oauth/authorize?client_id=test&response_type=code&version=
 *   POST https://api.vercel.com/oauth/access_token
 *        → 400 {"error":"invalid_client","error_description":"Invalid client: …"}
 *
 * The authorize endpoint is declared at its `api.vercel.com` address, the one
 * the schema names; it redirects the browser to the `vercel.com` consent
 * screen, which is the flow working as designed rather than a wrong URL.
 *
 * **No `scopes`.** Vercel's schema declares the authorization-code flow with
 * an empty `scopes` object: an Integration's reach is set by its configuration
 * in the Integration Console and by what the installing user grants it, not by
 * a scope string on the authorize request. Declaring invented scope names here
 * would put them on the wire for Vercel to ignore — or reject.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Vercel)",
  description: "Public OAuth flow for a Vercel Integration registered on this w6w installation. " +
    "Scope is set by the integration's configuration, not by this request.",
  connectionLabel: "{{user.username}}",
  oauth2: {
    authorizationUrl: `${API_URL}/oauth/authorize`,
    tokenUrl: `${API_URL}/oauth/access_token`,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/v2/user`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Vercel returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { accessToken, teamId } = credential as { accessToken: string; teamId?: string };
    // Vercel returns the installation's `team_id` alongside the token when the
    // integration was installed on a team, so it is adopted as the connection's
    // scope when present rather than asked for.
    const scope = { teamId: teamId || undefined };
    const res = await ctx.fetch(`${API_URL}/v2/user`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return scope;
    const body = await res.json().catch(() => null) as {
      user?: { id?: string; username?: string; email?: string };
    } | null;
    if (!body?.user) return scope;
    return {
      ...scope,
      user: { id: body.user.id, username: body.user.username, email: body.user.email },
    };
  },
};

export default oauth2;
