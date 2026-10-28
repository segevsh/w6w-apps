import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";
import { probe } from "./probe.ts";

/**
 * OAuth 2.0 with Facebook Login (the same flow the sibling `facebook` app uses) —
 * the "Instagram API with Facebook Login" path of the Instagram Platform. Register
 * a Meta app, add the Facebook Login product, and store the `client_id` +
 * `client_secret` + `redirect_uri` on the w6w server via
 * PUT /apps/:id/oauth-config/oauth2. The person connecting consents to the scopes
 * below and must be able to manage the Facebook Page linked to the Instagram
 * professional account.
 *
 * Scopes (Instagram Platform reference, checked 2026-10-05):
 *   - `instagram_basic`           — read profile and media; hashtag search.
 *   - `instagram_content_publish` — create containers and publish.
 *   - `instagram_manage_comments` — read/reply/hide/delete comments, mentions, tags.
 *   - `instagram_manage_insights` — account and media insights.
 *   - `pages_show_list`           — enumerate Pages (`list-instagram-accounts`).
 *   - `pages_read_engagement`     — required alongside the above by every endpoint.
 * If the user's Page role was granted through a Business Manager, Meta also wants
 * `ads_management` or `ads_read`; that is an account-structure matter rather than a
 * universal need, so it is not requested by default.
 *
 * Instagram Login (`www.instagram.com/oauth/authorize` + `api.instagram.com`) is a
 * different flow whose token is only valid on `graph.instagram.com`; it is not a
 * second method of this app — see README.md.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Facebook Login)",
  description:
    "Facebook Login for the Instagram API. Requires a Meta app registration (client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{user.name}} ({{user.id}})",
  oauth2: {
    authorizationUrl: "https://www.facebook.com/v23.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v23.0/oauth/access_token",
    scopes: [
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_comments",
      "instagram_manage_insights",
      "pages_show_list",
      "pages_read_engagement",
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
    return await probe(accessToken, ctx);
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me?fields=id,name`);
    if (!res.ok) return {};
    const user = await res.json() as { id?: string; name?: string };
    return { user: { id: user.id, name: user.name } };
  },
};

export default oauth2;
