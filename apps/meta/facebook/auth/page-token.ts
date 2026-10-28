import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Page Access Token (`bearer`) — the Page-scoped path.
 *
 * Most of this app's endpoints (`{page-id}/feed`, `{page-id}/photos`,
 * `{page-id}/videos`, `{page-id}/insights`, and comment moderation on a Page's
 * own posts) are authorized by a **Page** access token, not the **User** token
 * the `oauth2` method stores. Facebook's own tooling papers over this at call
 * time (Graph API Explorer swaps the token when you pick a Page); w6w cannot,
 * because "never put credentials in an Action" is a hard rule of the app
 * contract — `sign` is the only hook handed a credential, and it runs in a
 * network-less worker precisely so a credential-holder can never also be the
 * network-caller. The override is modelled as what it actually is: a second
 * Auth method the user selects per Connection, same pattern as
 * facebook-lead-ads.
 *
 * Get the token from Graph API Explorer (or `GET /me/accounts` with a user
 * token carrying `pages_show_list` — see `list-pages`) and paste it here.
 * Prefer a **long-lived** page token — short-lived ones expire in about an
 * hour.
 */
const pageToken: AuthDefinition = {
  key: "page-token",
  type: "bearer",
  displayName: "Page Access Token",
  description:
    "Paste a Page access token. Required for page-scoped endpoints (posts, comments, photos, videos, insights), which reject User tokens.",
  connectionLabel: "{{page.name}}",
  fields: [
    {
      key: "accessToken",
      label: "Page Access Token",
      type: "secret",
      required: true,
      hint:
        "Graph API Explorer → select your Page → generate a token with pages_manage_posts, pages_manage_engagement, pages_read_engagement and read_insights. Use a long-lived token.",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/me?fields=id,name`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Facebook returned ${res.status}` };
    return { ok: true };
  },

  /**
   * With a Page token, `/me` resolves to the Page itself (not a user) — which
   * is exactly the label we want on the Connection.
   */
  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me?fields=id,name`);
    if (!res.ok) return {};
    const page = await res.json() as { id?: string; name?: string };
    return { page: { id: page.id, name: page.name } };
  },
};

export default pageToken;
