import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 with Facebook for Business. Register a Facebook App in the Meta for
 * Developers console, add the "Facebook Login" product, and store the resulting
 * `client_id` + `client_secret` + `redirect_uri` on the w6w server via
 * PUT /apps/:id/oauth-config/oauth2. End users then connect via the browser
 * authorization dance and consent to the scopes below.
 *
 * Scopes cover the surface this app's actions exercise — pages, posts, comments,
 * photos/videos, insights and read-only ad-account campaigns — deliberately
 * narrower than facebook-lead-ads' `leads_retrieval`/`ads_management` (this app
 * does not read leads, and only *reads* ad campaigns, never manages them):
 *   - `pages_show_list`        — enumerate Pages the user manages (`list-pages`).
 *   - `pages_read_engagement`  — read Page/post/comment content (`get-page`,
 *                                 `list-posts`, `get-post`, `list-comments`).
 *   - `pages_manage_posts`     — create/delete posts and upload media
 *                                 (`create-post`, `delete-post`, `upload-photo`).
 *   - `pages_manage_engagement` — create/delete comments as the Page
 *                                 (`create-comment`, `delete-comment`).
 *   - `pages_read_user_content` — read user-generated comments on Page content.
 *   - `read_insights`          — Page insights (`get-page-insights`).
 *   - `ads_read`               — read-only ad-account campaign listing
 *                                 (`list-ad-campaigns`).
 *
 * Facebook supports PKCE on its OAuth server, so `pkce` is left at the type
 * default (true). Access tokens issued here are User tokens; several actions in
 * this app hit Page-scoped endpoints that reject a User token outright — connect
 * with the `page-token` auth method for those (see auth/page-token.ts), or
 * exchange `/{page-id}?fields=access_token` yourself, mirroring `list-pages`.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Facebook)",
  description:
    "Public OAuth flow. Requires a Facebook App registration (client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{user.name}} ({{user.id}})",
  oauth2: {
    authorizationUrl: "https://www.facebook.com/v23.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v23.0/oauth/access_token",
    scopes: [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "pages_manage_engagement",
      "pages_read_user_content",
      "read_insights",
      "ads_read",
    ],
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
    if (!res.ok) return { ok: false, message: `Facebook returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me?fields=id,name`);
    if (!res.ok) return {};
    const user = await res.json() as { id?: string; name?: string };
    return { user: { id: user.id, name: user.name } };
  },
};

export default oauth2;
