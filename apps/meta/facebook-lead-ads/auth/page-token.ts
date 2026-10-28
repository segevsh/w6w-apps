import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Page Access Token (`bearer`) — the Page-scoped path.
 *
 * The leadgen surface (`/{page_id}/leadgen_forms`, `/{form_id}/leads`) is
 * authorized by a **Page** access token, not the **User** token that the
 * `oauth2` method stores. n8n papers over this at call time: it fetches
 * `/{page_id}?fields=access_token` with the user token and swaps the
 * Authorization header for the page token inside the node's request helper.
 *
 * w6w cannot do that. "Never put credentials in an Action" is a hard rule of
 * the app contract — `sign` is the only hook handed a credential, and it runs
 * in a network-less worker precisely so a credential-holder can never also be
 * the network-caller. An Action that accepts a token as a param and stamps it
 * into a header breaks that isolation, so the override is modelled as what it
 * actually is: a second Auth method the user selects per Connection.
 *
 * Get the token from Graph API Explorer (or `GET /me/accounts` with a user
 * token carrying `pages_show_list`) and paste it here. Prefer a **long-lived**
 * page token — short-lived ones expire in about an hour.
 */
const pageToken: AuthDefinition = {
  key: "page-token",
  type: "bearer",
  displayName: "Page Access Token",
  description:
    "Paste a Page access token. Required for the leadgen endpoints, which reject User tokens.",
  connectionLabel: "{{page.name}}",
  fields: [
    {
      key: "accessToken",
      label: "Page Access Token",
      type: "secret",
      required: true,
      hint:
        "Graph API Explorer → select your Page → generate a token with `leads_retrieval` + `pages_read_engagement`. Use a long-lived token.",
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
