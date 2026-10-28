import type { ActionDefinition } from "@w6w/types";
import { GraphClient, type PagedResult, seg } from "../lib/client.ts";
import { chatIdParam, filterParam, pagedOutput, pagingParams } from "../lib/params.ts";

interface Input {
  chatId: string;
  orderby?: string;
  filter?: string;
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /chats/{chat-id}/messages`
 *
 * https://learn.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0
 *
 * The messages in one chat. Delegated `Chat.Read` is the least-privileged scope;
 * this App holds `Chat.ReadWrite`, and **neither needs admin consent** — the
 * sharp contrast with channel messages, where reading is admin-gated.
 *
 * The `$filter` rule here is unusual enough to be worth stating rather than
 * hinting at: filtering only works when `$orderby` and `$filter` name the **same
 * property**, and otherwise `$filter` is *silently ignored* — not rejected. That
 * is why Order by is a select and its options match the filterable properties.
 *
 *  - `$orderby`: `lastModifiedDateTime` (the default) or `createdDateTime`,
 *    **descending only**.
 *  - `$filter`: a date range. `lastModifiedDateTime` supports `gt` and `lt`;
 *    `createdDateTime` supports `lt` only.
 *  - `$top` caps at **50**.
 */
const listChatMessages: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-chat-messages",
  type: "search",
  resource: "chat-message",
  title: "List Chat Messages",
  description: "List the messages in a one-on-one, group or meeting chat.",
  params: [
    chatIdParam,
    {
      key: "orderby",
      label: "Order by",
      type: "select",
      options: [
        { value: "lastModifiedDateTime desc", label: "Last modified (Graph default)" },
        { value: "createdDateTime desc", label: "Created" },
      ],
      hint:
        "OData `$orderby`, descending only — ascending is not supported. Set this whenever you use Filter: Graph ignores a filter whose property does not match the ordering.",
    },
    filterParam(
      "OData `$filter` — a date range only, on the *same* property as Order by, or it is silently ignored. `lastModifiedDateTime` accepts `gt` and `lt`; `createdDateTime` accepts `lt` only. Example: `lastModifiedDateTime gt 2026-08-01T00:00:00.000Z`.",
    ),
    ...pagingParams({ defaultTop: 20, maxTop: 50 }),
  ],
  output: pagedOutput("Messages"),

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const path = `/chats/${seg(input.chatId)}/messages`;
    const options = {
      query: {
        $orderby: input.orderby,
        $filter: input.filter,
        $top: input.top,
      },
    };

    const target = input.nextLink ?? path;
    const opts = input.nextLink ? {} : options;

    return input.all
      ? client.collect(target, opts, input.maxPages ?? 10)
      : client.page(target, opts);
  },
};

export default listChatMessages;
