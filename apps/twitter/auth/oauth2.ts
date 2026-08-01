import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 Authorization Code flow with PKCE — the only user-context auth the
 * X API v2 supports. `client_id` / `client_secret` / `redirect_uri` live on the
 * w6w server (PUT /apps/:id/oauth-config/oauth2), not in this package.
 *
 * X's authorize step happens on `x.com` (`https://x.com/i/oauth2/authorize`,
 * per docs.x.com/fundamentals/authentication/oauth-2-0/user-access-token,
 * checked 2026-07-31) while token exchange is on the API host,
 * `https://api.x.com/2/oauth2/token`. Both are OAuth endpoint hosts, allowed
 * implicitly — neither needs an entry in `w6w.network.allow`.
 *
 * PKCE is REQUIRED by X for this flow (not merely offered), so `pkce` is left
 * at the type's default of `true` rather than restated.
 *
 * `offline.access` is requested for a refresh token — X user access tokens
 * expire in 2 hours and a refresh token is only issued when this scope is
 * present at authorize time. Token renewal itself is the standard
 * `grant_type=refresh_token` request against the same token endpoint; every
 * other oauth2 Auth in this pack relies on the host driving that generic grant
 * from the declared `oauth2.refreshUrl` rather than a bespoke `refresh` hook,
 * and X's endpoint needs nothing app-specific either, so this app does the
 * same (`refreshUrl` is stated explicitly here, even though it equals
 * `tokenUrl` and would default to it, so the renewal path is visible without
 * reading the spec).
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth 2.0 (Sign in with X)",
  description:
    "Authorization Code flow with PKCE. Requires an X App (developer.x.com) registered on this w6w installation.",
  connectionLabel: "@{{user.username}}",
  oauth2: {
    authorizationUrl: "https://x.com/i/oauth2/authorize",
    tokenUrl: "https://api.x.com/2/oauth2/token",
    refreshUrl: "https://api.x.com/2/oauth2/token",
    scopes: [
      "tweet.read",
      "tweet.write",
      "users.read",
      "like.write",
      "media.write",
      "offline.access",
    ],
    scopeSeparator: " ",
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `X returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/me`);
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      data?: { id?: string; username?: string; name?: string };
    };
    return { user: body.data };
  },
};

export default oauth2;
