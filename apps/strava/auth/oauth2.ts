import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 with a Strava API application. The `client_id` / `client_secret` /
 * `redirect_uri` live on the w6w server (PUT /apps/:id/oauth-config/oauth2),
 * not in this package.
 *
 * Verified against https://developers.strava.com/docs/authentication/
 * (checked 2026-08-01):
 *
 *   - Authorize at `www.strava.com/oauth/authorize`; exchange AND refresh both
 *     go through the same `www.strava.com/oauth/token` endpoint, distinguished
 *     only by `grant_type` (`authorization_code` vs `refresh_token`) — so
 *     `refreshUrl` below is identical to `tokenUrl`, not a separate host.
 *   - Access tokens are genuinely short-lived: **6 hours** (`expires_in: 21600`).
 *     A workflow host MUST refresh proactively rather than treat OAuth2 as a
 *     "connect once" credential — this app has no long-lived token option.
 *   - Refresh tokens **rotate on every use**: "Every time you get a new access
 *     token, we return a new refresh token as well... the older code will no
 *     longer work." The host's generic refresh handling (store whatever comes
 *     back in the token response) already satisfies this; called out here so
 *     nobody "fixes" it into reusing the old refresh_token.
 *   - Scopes are documented as comma- OR space-delimited; this app requests
 *     them comma-separated, Strava's own docs example and every existing
 *     integration (n8n's Strava node included) use that form.
 *   - Strava's OAuth server does not document PKCE support, so it is left off.
 *
 * Scopes requested cover exactly what this app's actions call: `activity:write`
 * for Create/Update Activity, `activity:read_all` so activity reads are not
 * silently filtered to "everyone" visibility (Strava's `read`/`activity:read`
 * scopes only return activities the athlete marked public), and `profile:read_all`
 * so Get Athlete Profile returns full (not just summary) athlete fields.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Connect Strava)",
  description:
    "Public OAuth flow. Requires a Strava API application registered on this w6w installation.",
  connectionLabel: "{{athlete.firstname}} {{athlete.lastname}}",
  oauth2: {
    authorizationUrl: "https://www.strava.com/oauth/authorize",
    tokenUrl: "https://www.strava.com/oauth/token",
    refreshUrl: "https://www.strava.com/oauth/token",
    scopes: ["profile:read_all", "activity:read_all", "activity:write"],
    scopeSeparator: ",",
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
    const res = await ctx.fetch(`${API_URL}/athlete`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Strava returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/athlete`);
    if (!res.ok) return {};
    const me = await res.json().catch(() => ({})) as {
      id?: number;
      firstname?: string;
      lastname?: string;
    };
    return { athlete: { id: me.id, firstname: me.firstname, lastname: me.lastname } };
  },
};

export default oauth2;
