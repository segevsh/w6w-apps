import type { AuthDefinition } from "@w6w/types";
import { OAUTH_BASE } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — Flodesk's "partner integration" path.
 *
 * Unlike some vendors in this pack, Flodesk publishes the complete flow, so
 * nothing here is guessed. Every value below is quoted from Flodesk's own API
 * description (read 2026-08-03):
 *
 *   Authorize: `https://api.flodesk.com/oauth2/authorize?client_id=<id>`
 *              `&redirect_uri=<uri>&response_type=code&state=<random>`
 *   Token:     `POST https://api.flodesk.com/oauth2/token`
 *              with `Authorization: Basic base64(client_id:client_secret)`,
 *              `Content-Type: application/x-www-form-urlencoded`, and
 *              `code=…&redirect_uri=…&grant_type=authorization_code`
 *   Scope:     exactly one — `all` ("full access to all API resources")
 *   Response:  `{ access_token, token_type: "Bearer", expires_in: 86400,`
 *              `  scopes: "all", refresh_token: "fd_rt_…" }`
 *   UserInfo:  `GET https://api.flodesk.com/oauth2/userinfo`
 *              → `{ id, email, full_name, profile_url, created_at }`
 *
 * ## `pkce: false` — a deliberate reading, not an oversight
 *
 * `OAuth2Config.pkce` DEFAULTS TO TRUE, so leaving it out would silently turn
 * PKCE on. Flodesk's documented authorize URL carries no `code_challenge` /
 * `code_challenge_method`, its documented token exchange sends no
 * `code_verifier`, and it authenticates the client with an HTTP Basic
 * `client_id:client_secret` pair — the confidential-client pattern. Sending an
 * unrequested `code_challenge` to a server that does not expect one risks the
 * authorize call being rejected outright. So it is turned off explicitly.
 *
 * ## Verification codes and token lifetimes
 *
 * The authorization code expires in 30 minutes. Access tokens carry
 * `expires_in: 86400` (24 hours), so `refreshUrl` is declared for silent
 * renewal against the same token endpoint.
 *
 * ## Refresh-token rotation — read this before debugging a 400
 *
 * Flodesk's refresh tokens are **single-use**: "Every time a client performs a
 * token refresh, a new refresh_token is issued along with a new access_token,
 * and the previous refresh_token is invalidated." The host must persist the
 * newly-issued `refresh_token` from every refresh response. Replaying a spent
 * one fails, and the connection then needs a fresh authorization.
 *
 * No custom `refresh` hook is implemented: the renewal is a standard
 * `grant_type=refresh_token` post to `refreshUrl` authenticated with the client
 * credentials, which the host performs — and which is the right place for it,
 * since the `client_secret` lives in the host's per-app OAuth config and is
 * deliberately not shipped in this package.
 *
 * ## Availability
 *
 * Client credentials are not self-serve. Flodesk gates them on an application
 * form ("To apply to build a partner integration, please submit a request using
 * this form" — a ClickUp form linked from the API description), so this method
 * only becomes usable once Flodesk has approved the integration and its
 * `client_id` / `client_secret` / `redirect_uri` are stored on this w6w
 * installation via `PUT /apps/:id/oauth-config/oauth2`. The API-key method
 * needs none of that and is the default path for a single account.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Flodesk)",
  description:
    "Partner OAuth flow. Requires Flodesk-approved client credentials (client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{user.fullName}} ({{user.email}})",
  oauth2: {
    authorizationUrl: `${OAUTH_BASE}/authorize`,
    tokenUrl: `${OAUTH_BASE}/token`,
    refreshUrl: `${OAUTH_BASE}/token`,
    // Flodesk's only scope. Its own token response echoes `"scopes": "all"`.
    scopes: ["all"],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /oauth2/userinfo` — Flodesk's documented whoami, and the only call in
   * the whole surface that needs no scope beyond the token itself.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${OAUTH_BASE}/userinfo`, {
      headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) return { ok: true };

    const text = await res.text().catch(() => "");
    return {
      ok: false,
      message: text
        ? `Flodesk returned HTTP ${res.status}: ${text.slice(0, 200)}`
        : `Flodesk returned HTTP ${res.status}`,
    };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${OAUTH_BASE}/userinfo`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as {
      id?: string;
      email?: string;
      full_name?: string;
      profile_url?: string;
      created_at?: string;
    } | null;
    if (!body) return {};
    return {
      user: {
        id: body.id,
        email: body.email,
        fullName: body.full_name,
        profileUrl: body.profile_url,
        createdAt: body.created_at,
      },
    };
  },
};

export default oauth2;
