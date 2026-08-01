import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 Authorization Code flow with PKCE — Spotify's user-context auth
 * (developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow,
 * checked 2026-08-01). `client_id` / `client_secret` / `redirect_uri` live on
 * the w6w server (PUT /apps/:id/oauth-config/oauth2), not in this package.
 *
 * Endpoints: the authorize step is on the accounts host
 * (`https://accounts.spotify.com/authorize`), token exchange and refresh are
 * both `https://accounts.spotify.com/api/token`. Both are OAuth endpoint
 * hosts, allowed implicitly — neither needs restating in `w6w.network.allow`
 * (this app's own allowlist covers `api.spotify.com` for the actions and
 * lists `accounts.spotify.com` alongside it for clarity).
 *
 * PKCE is supported for the Authorization Code flow and is left at the
 * type's default of `true`, stated explicitly here so the choice is visible
 * without reading the spec.
 *
 * `refreshUrl` is stated explicitly even though it equals `tokenUrl` and
 * would default to it: access tokens expire in 1 hour
 * (developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens),
 * so renewal is not an edge case here. It is the standard
 * `grant_type=refresh_token` request against the same token endpoint, which
 * the host drives generically — no bespoke `refresh` hook is declared.
 *
 * Scopes are the minimum each shipped action needs: `user-read-private` +
 * `user-read-email` for the profile read, `playlist-read-private` for
 * listing the user's own playlists (public ones are visible without it, but
 * private ones are not), `playlist-modify-public` + `playlist-modify-private`
 * for creating a playlist and adding tracks to one (which scope applies
 * depends on the target playlist's visibility, so both are requested),
 * and `user-read-currently-playing` for the playback-state read. Search and
 * the track/album/artist lookups need no scope at all.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Spotify)",
  description:
    "Authorization Code flow with PKCE. Requires a Spotify app (developer.spotify.com/dashboard) registered on this w6w installation.",
  connectionLabel: "{{user.display_name}}",
  oauth2: {
    authorizationUrl: "https://accounts.spotify.com/authorize",
    tokenUrl: "https://accounts.spotify.com/api/token",
    refreshUrl: "https://accounts.spotify.com/api/token",
    scopes: [
      "user-read-private",
      "user-read-email",
      "playlist-read-private",
      "playlist-modify-public",
      "playlist-modify-private",
      "user-read-currently-playing",
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
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Spotify returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me`);
    if (!res.ok) return {};
    const me = await res.json().catch(() => ({})) as {
      id?: string;
      display_name?: string;
      email?: string;
    };
    return { user: { id: me.id, display_name: me.display_name, email: me.email } };
  },
};

export default oauth2;
