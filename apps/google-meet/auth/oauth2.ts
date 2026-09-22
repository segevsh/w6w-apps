import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 — the "public integrator" path. You register an app in the Google
 * Cloud Console, enable the Google Meet API, store the resulting `client_id` +
 * `client_secret` + `redirect_uri` on the w6w server, and end users then connect
 * via the browser authorization dance. Google requires `access_type=offline` +
 * `prompt=consent` to reliably hand back a refresh token on every consent.
 *
 * The scope set is exactly the one the Meet v2 discovery document publishes
 * under `auth.oauth2.scopes` — `meetings.space.created` (create/edit/see your
 * app's conferences), `meetings.space.readonly` (read any of the user's
 * conferences) and `meetings.space.settings` (edit/see settings for all the
 * user's Meet calls). All three are requested because the app both creates and
 * reads spaces, and edits their settings.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow. Requires a Google Cloud project with the Google Meet API enabled and OAuth client credentials configured on this w6w installation.",
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    refreshUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: [
      "https://www.googleapis.com/auth/meetings.space.created",
      "https://www.googleapis.com/auth/meetings.space.readonly",
      "https://www.googleapis.com/auth/meetings.space.settings",
    ],
    // Google needs these on the authorize URL to hand back a refresh_token.
    extraAuthParams: {
      access_type: "offline",
      prompt: "consent",
    },
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
    // `conferenceRecords` is the cheapest read that proves a Meet scope is
    // present, and it succeeds even for an account with no meeting history —
    // an empty list is still a 200. A `spaces.get` probe would need a concrete
    // space name or meeting code the auth hook does not have.
    const res = await ctx.fetch(`${API_URL}/conferenceRecords?pageSize=1`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Google Meet returned ${res.status}` };
    return { ok: true };
  },
  // No `afterConnect`: the Meet API exposes no "who am I" endpoint, so there is
  // nothing to populate `connectionLabel` from — inventing a call would be a
  // lie. The connection is identified by its label alone.
};

export default oauth2;
