import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";
import { probe } from "./probe.ts";

/**
 * Pasted access token (`bearer`) — for a Facebook User or Page access token
 * generated outside w6w (Graph API Explorer, a System User in Business Manager),
 * which skips the OAuth app registration. Publishing, comment moderation and
 * insights are authorized by a Page token or a User token carrying the scopes
 * listed on the `oauth2` method; use a long-lived token.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "Paste a Facebook User or Page access token carrying the Instagram permissions. Use a long-lived token.",
  connectionLabel: "{{account.name}}",
  fields: [
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint:
        "Graph API Explorer: choose your app, grant instagram_basic, instagram_content_publish, instagram_manage_comments, instagram_manage_insights, pages_show_list and pages_read_engagement, then extend to a long-lived token.",
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
    return await probe(accessToken, ctx);
  },

  /** `/me` is the Facebook User (or the Page, for a Page token) the token belongs to. */
  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me?fields=id,name`);
    if (!res.ok) return {};
    const me = await res.json() as { id?: string; name?: string };
    return { account: { id: me.id, name: me.name } };
  },
};

export default accessToken;
