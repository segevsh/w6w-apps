import type { ActionDefinition } from "@w6w/types";
import { FacebookClient, type FacebookListResponse } from "../lib/client.ts";

interface Input {
  cursor?: string;
  limit?: number;
}

interface PageSummary {
  id: string;
  name: string;
  category?: string;
  access_token?: string;
  tasks?: string[];
}

/**
 * List the Facebook Pages the connected user manages — `GET /me/accounts`.
 * Needs a User token (the `oauth2` auth method) carrying `pages_show_list`; a
 * Page token has no "accounts" of its own and returns an empty list.
 *
 * The response includes each Page's own access token (`access_token`) —
 * useful to hand to the `page-token` auth method's fields when connecting a
 * Page directly, but this action never signs a request with it: reading a
 * value out of a response body and pasting it into a *different* Connection's
 * setup form is the user's action, not this app's.
 */
const listPages: ActionDefinition<Input, FacebookListResponse<PageSummary>> = {
  key: "list-pages",
  type: "read",
  resource: "page",
  title: "List Pages",
  description: "List the Facebook Pages the connected user manages.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 25 },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "Facebook `after` cursor for pagination.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Pages" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  execute(input, ctx) {
    const client = new FacebookClient(ctx);
    return client.request<FacebookListResponse<PageSummary>>("/me/accounts", {
      params: {
        fields: "id,name,category,access_token,tasks",
        limit: input.limit ?? 25,
        after: input.cursor,
      },
    });
  },
};

export default listPages;
