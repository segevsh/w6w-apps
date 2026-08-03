import type { AuthDefinition } from "@w6w/types";
import { PEOPLE_API } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the "sign in with Google" path, and the **only** auth
 * method this app ships.
 *
 * Why no `service-account` (unlike the sibling google-sheets / google-drive
 * apps): the People API's contact surface is entirely "the signed-in user's own
 * contacts". A Drive file can be *shared* with a service account's email, so a
 * plain service account is a first-class principal there. A contact cannot —
 * there is no share model for a person's address book, and a bare service
 * account simply has an empty one, so `people/me/connections` would return
 * nothing. The only way a service account reaches real contacts is Google
 * Workspace **domain-wide delegation**, where an admin grants the service
 * account the contacts scope and it impersonates a named domain user. That is
 * an admin-provisioned, Workspace-only configuration rather than "a service
 * account", so shipping it as if it were the Sheets/Drive flow would mislead.
 * See the README's Auth section.
 *
 * Setup: register an app in Google Cloud Console (APIs & Services →
 * Credentials → OAuth client ID), enable the **People API**, then store the
 * `client_id` / `client_secret` / `redirect_uri` on the w6w server via
 * PUT /apps/:id/oauth-config/oauth2.
 *
 * Google specifics:
 *   - Scopes: `contacts` (read + write the user's contacts and contact groups)
 *     and `contacts.other.readonly` (the auto-collected "Other contacts" list
 *     that `list-other-contacts` reads — it is not covered by `contacts`).
 *     `directory.readonly` is deliberately absent: this app implements no
 *     directory action, and asking for a domain-wide read the user does not
 *     need is a worse consent screen for no gain.
 *   - `access_type=offline` + `prompt=consent` so we always receive a refresh
 *     token, even for returning users. Without these Google silently omits
 *     `refresh_token` on subsequent grants.
 *   - PKCE off: server-side app; the client secret is the trust anchor.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow. Requires a Google Cloud OAuth 2.0 client (client_id / client_secret / redirect_uri) configured on this w6w installation, with the Google People API enabled.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/contacts",
      "https://www.googleapis.com/auth/contacts.other.readonly",
    ],
    extraAuthParams: { access_type: "offline", prompt: "consent" },
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
    // The narrowest probe the People API offers: read one field off the
    // signed-in user's own profile. `personFields` is required on `people.get`,
    // so we ask for the single cheapest mask rather than omitting it — omitting
    // it is a 400, which would report a live credential as broken.
    const res = await ctx.fetch(`${PEOPLE_API}/people/me?personFields=names`);
    if (!res.ok) return { ok: false, message: `Google returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    // Google's `userinfo` endpoint needs the OpenID scopes, which are not in
    // our default set, so `user.name`/`user.email` may come back empty and
    // `connectionLabel` falls back to the connection's own name. The hook stays
    // so the wiring point is visible for installs that widen the scopes.
    const res = await ctx.fetch("https://www.googleapis.com/oauth2/v3/userinfo");
    if (!res.ok) return {};
    const user = await res.json() as { sub?: string; name?: string; email?: string };
    return {
      user: { id: user.sub, name: user.name, email: user.email },
    };
  },
};

export default oauth2;
