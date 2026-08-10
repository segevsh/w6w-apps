import type { AuthDefinition } from "@w6w/types";
import { SLIDES_API } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the "sign in with Google" path. You register an app
 * in Google Cloud Console (APIs & Services → Credentials → OAuth client ID),
 * enable the Google Slides API, then store the `client_id` / `client_secret` /
 * `redirect_uri` on the w6w server via PUT /apps/:id/oauth-config/oauth2. End
 * users then connect via the browser authorization dance.
 *
 * Scope, verified against the per-method `scopes` list in the Slides API
 * discovery document (revision 20260729):
 *   - `presentations` — the single scope that appears on **all five** methods
 *     (`create`, `get`, `batchUpdate`, `pages.get`, `pages.getThumbnail`). It
 *     is therefore sufficient on its own for every action in this app.
 *
 * Deliberately NOT requested, unlike the sibling google-docs / google-sheets /
 * google-forms apps:
 *   - `drive` / `drive.file` / `drive.readonly` — those apps ask for a Drive
 *     scope because they *call* Drive (Docs creates its file through Drive,
 *     Forms enumerates through Drive). This app calls no Drive endpoint, so
 *     asking for Drive would be widening the grant for nothing. Folder
 *     placement and sharing belong to the `google-drive` app.
 *   - `spreadsheets` / `spreadsheets.readonly` — only the `createSheetsChart`,
 *     `refreshSheetsChart` and `replaceAllShapesWithSheetsChart` members of the
 *     batchUpdate union need them, and this app ships no action for those. If
 *     you push one through the raw `presentation-batch-update` escape hatch,
 *     add the scope here yourself — it is not requested silently.
 *   - `presentations.readonly` — strictly weaker than `presentations`, which is
 *     already granted; asking for both adds nothing but consent-screen noise.
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
    "Public OAuth flow. Requires a Google Cloud OAuth 2.0 client (client_id / client_secret / redirect_uri) configured on this w6w installation, with the Google Slides API enabled.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/presentations"],
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
    // The Slides API is per-presentation: all five methods need a
    // presentationId, and there is no whoami, ping or list endpoint a
    // credential can reach without already knowing a deck. So there is nothing
    // cheap to probe on the API itself, and we validate the *token* instead —
    // the same choice, for the same reason, as the Docs, Sheets and Forms apps
    // in this pack.
    //
    // POSTed form-encoded rather than as `?access_token=…`: the endpoint
    // accepts both, and the POST form keeps the bearer token out of the request
    // URL (and therefore out of proxy logs and error strings). The response
    // body is token *metadata* — `aud`, `scope`, `exp`, `expires_in` — and
    // never echoes the token back, so reading it cannot leak the credential.
    const res = await ctx.fetch("https://oauth2.googleapis.com/tokeninfo", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ access_token: accessToken }).toString(),
    });
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
export { SLIDES_API };
