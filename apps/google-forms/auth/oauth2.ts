import type { AuthDefinition } from "@w6w/types";
import { FORMS_API } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the "sign in with Google" path. You register an app
 * in Google Cloud Console (APIs & Services → Credentials → OAuth client ID),
 * enable the Google Forms API + Google Drive API, then store the
 * `client_id` / `client_secret` / `redirect_uri` on the w6w server via
 * PUT /apps/:id/oauth-config/oauth2. End users then connect via the browser
 * authorization dance.
 *
 * Scopes, each verified against the per-method `scopes` list in the Forms API
 * discovery document (revision 20260729):
 *   - `forms.body` — required by `forms.create`, `forms.batchUpdate` and
 *     `forms.setPublishSettings`, and sufficient for `forms.get`.
 *   - `forms.responses.readonly` — required by `forms.responses.list` /
 *     `forms.responses.get`. Read-only is the strongest the API offers: there
 *     is no write scope for responses because there is no write method.
 *   - `drive.file` — per-file Drive access for forms this app created or the
 *     user explicitly opened with it.
 *   - `drive.metadata.readonly` — needed by `list-forms`. Drive's `files.list`
 *     under `drive.file` alone only ever returns files this app created, which
 *     makes "list my forms" answer "nothing" for pre-existing forms. This is a
 *     restricted scope in Google's verification programme; drop it (and the
 *     `list-forms` action with it) if you would rather not go through review.
 *
 * `access_type=offline` + `prompt=consent` on the authorize URL so we always
 * receive a refresh token, even for returning users. Without these Google
 * silently omits `refresh_token` on subsequent grants. PKCE off: server-side
 * app; the client secret is the trust anchor.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow. Requires a Google Cloud OAuth 2.0 client (client_id / client_secret / redirect_uri) configured on this w6w installation, with the Google Forms and Drive APIs enabled.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/forms.body",
      "https://www.googleapis.com/auth/forms.responses.readonly",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
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
    // The Forms API is per-form: every method needs a formId, so there is no
    // scope-free "whoami" to probe. Validate the token itself with Google's
    // public tokeninfo introspection endpoint instead — same choice the Sheets
    // and Docs apps in this pack make, for the same reason.
    const res = await ctx.fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!res.ok) return { ok: false, message: `Google returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    // `userinfo` needs the OpenID scopes, which are not in our default set, so
    // this is best-effort: on failure we simply return no label data.
    const res = await ctx.fetch("https://www.googleapis.com/oauth2/v3/userinfo");
    if (!res.ok) return {};
    const user = await res.json() as { sub?: string; name?: string; email?: string };
    return {
      user: { id: user.sub, name: user.name, email: user.email },
    };
  },
};

export default oauth2;

// Re-exported so tests can assert against the same constant the client uses.
export { FORMS_API };
