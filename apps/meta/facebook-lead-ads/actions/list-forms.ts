import type { ActionDefinition } from "@w6w/types";
import { FacebookClient, type FacebookListResponse } from "../lib/client.ts";

interface Input {
  pageId: string;
  cursor?: string;
}

interface FormSummary {
  id: string;
  name: string;
  status?: string;
  locale?: string;
}

/**
 * List Lead Ads forms belonging to a Facebook Page.
 *
 * Facebook's `/{page_id}/leadgen_forms` endpoint wants a **Page** access token,
 * not the connected user's token. n8n resolves that inside the node — it fetches
 * `/{page_id}?fields=access_token` and swaps the Authorization header at call
 * time. An Action cannot do that here: only the auth `sign` hook may touch a
 * credential. Connect with the `page-token` auth method when the user token
 * lacks Page-scoped access (a user token carrying `pages_read_engagement` +
 * `pages_show_list` also works for this edge).
 */
const listForms: ActionDefinition<Input, FacebookListResponse<FormSummary>> = {
  key: "list-forms",
  type: "read",
  resource: "form",
  title: "List Lead Ads Forms",
  description:
    "List the lead-generation forms for a Facebook Page. Use the returned form id in `list-recent-leads`.",
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "Facebook `after` cursor for pagination.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Forms" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  execute(input, ctx) {
    const client = new FacebookClient(ctx);
    return client.request<FacebookListResponse<FormSummary>>(
      `/${input.pageId}/leadgen_forms`,
      {
        query: {
          fields: "id,name,status,locale",
          after: input.cursor,
        },
      },
    );
  },
};

export default listForms;
