import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient, spaceName } from "../lib/client.ts";

interface Input {
  space?: string;
  filter: string;
  orderBy?: string;
  view?: "SEARCH_MESSAGES_VIEW_BASIC" | "SEARCH_MESSAGES_VIEW_FULL";
  pageSize?: number;
  pageToken?: string;
}

interface SearchPayload {
  filter: string;
  orderBy?: string;
  view?: string;
  pageSize?: number;
  pageToken?: string;
}

/**
 * `spaces.messages.search` — POST /v1/{parent=spaces/*}/messages:search
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages/search
 *
 * **User authentication only** — the discovery document lists exactly
 * `chat.messages` and `chat.messages.readonly` for this method, no `chat.bot`
 * and no `chat.app.*`. A Chat app cannot search.
 *
 * A POST that reads, so `type: "search"` rather than `perform`: every parameter
 * except `parent` lives in the request *body*, not the query string.
 *
 * `parent` accepts exactly two shapes — `spaces/-` for "everywhere I can see"
 * (the default when Space is left blank) or one concrete `spaces/{space}`.
 * Anything else is an `INVALID_ARGUMENT`, so narrowing to several spaces is done
 * with `space.name` inside the filter instead.
 */
const searchMessages: ActionDefinition<Input> = {
  key: "search-messages",
  type: "search",
  resource: "message",
  title: "Search Messages",
  description:
    "Search messages across every space the authenticated user can see, or within one space. Requires a user connection — this endpoint has no app-authentication equivalent.",
  params: [
    {
      key: "space",
      label: "Space",
      type: "string",
      hint:
        "Leave blank to search every space the user can see. Set to one space id to scope the search; to cover several spaces, leave this blank and use `space.name` in the filter.",
      placeholder: "spaces/AAAAAAAAAAA",
    },
    {
      key: "filter",
      label: "Filter",
      type: "text",
      required: true,
      hint:
        "Chat search query. Supports fields such as `text`, `sender.name`, `space.name`, `space.display_name` and `create_time`, combined with AND/OR/NOT.",
      placeholder: 'text:"deploy" AND create_time > "2026-01-01T00:00:00+00:00"',
    },
    {
      key: "orderBy",
      label: "Order",
      type: "string",
      hint: "e.g. `create_time DESC`.",
      placeholder: "create_time DESC",
    },
    {
      key: "view",
      label: "View",
      type: "select",
      options: [
        { value: "SEARCH_MESSAGES_VIEW_BASIC", label: "Basic — a reduced message" },
        { value: "SEARCH_MESSAGES_VIEW_FULL", label: "Full — the complete message" },
      ],
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "messages", type: "array", label: "Matching messages" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    // `spaces/-` is Google's documented wildcard parent for a cross-space search.
    const parent = input.space?.trim() ? spaceName(input.space) : "spaces/-";
    const body: SearchPayload = { filter: input.filter };
    if (input.orderBy !== undefined) body.orderBy = input.orderBy;
    if (input.view !== undefined) body.view = input.view;
    if (input.pageSize !== undefined) body.pageSize = input.pageSize;
    if (input.pageToken !== undefined) body.pageToken = input.pageToken;

    return await client.request(`/${parent}/messages:search`, { method: "POST", body });
  },
};

export default searchMessages;
