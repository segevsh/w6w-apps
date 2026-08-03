import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult } from "../lib/client.ts";
import { filterParam, pagedOutput, pagingParams } from "../lib/params.ts";

interface Input {
  filter?: string;
  expand?: string[];
  orderby?: string;
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /me/chats`
 *
 * https://learn.microsoft.com/en-us/graph/api/chat-list?view=graph-rest-1.0
 *
 * The one-on-one, group and meeting chats the signed-in user is part of.
 * Delegated `Chat.ReadBasic` is enough to list them; this App holds
 * `Chat.ReadWrite`, which covers listing, reading and sending in one
 * non-admin-consented scope.
 *
 * This action is a prerequisite rather than an end in itself: **Graph's v1.0
 * `Send Chat Message` cannot create a chat.** Its reference says so outright —
 * "This API can't create a new chat; you must use the list chats method to
 * retrieve the ID of an existing chat". So the chat must already exist, and this
 * is how you find its id.
 *
 * Query surface, exactly as documented:
 *  - `$top` caps at **50**.
 *  - `$expand` supports **`members`** and **`lastMessagePreview`** only.
 *  - `$orderby` supports **`lastMessagePreview/createdDateTime desc`** only —
 *    ascending is explicitly unsupported, which is why this is a select rather
 *    than a free-text field.
 *  - `$filter` is supported.
 *
 * One documented limitation the hint carries: with `$expand=members` the
 * response returns **at most 25 members** per chat regardless of `$top`, so a
 * large group chat's membership is silently truncated.
 */
const listChats: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-chats",
  type: "search",
  resource: "chat",
  title: "List Chats",
  description: "List the chats the signed-in user is part of — one-on-one, group and meeting.",
  params: [
    {
      key: "expand",
      label: "Expand",
      type: "multiselect",
      options: [
        { value: "members", label: "Members" },
        { value: "lastMessagePreview", label: "Last message preview" },
      ],
      hint:
        "OData `$expand`; only these two are supported. `members` is capped at 25 entries per chat regardless of page size — a documented limitation, so do not treat it as the full roster of a large group chat.",
    },
    {
      key: "orderby",
      label: "Order by",
      type: "select",
      advanced: true,
      options: [
        {
          value: "lastMessagePreview/createdDateTime desc",
          label: "Most recent message first",
        },
      ],
      hint:
        "OData `$orderby`. This is the only ordering Graph supports for chats — ascending order is explicitly not supported.",
    },
    filterParam("OData `$filter`, e.g. `chatType eq 'oneOnOne'`."),
    ...pagingParams({ defaultTop: 20, maxTop: 50 }),
  ],
  output: pagedOutput("Chats"),

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const options = {
      query: {
        $filter: input.filter,
        $expand: odataList(input.expand),
        $orderby: input.orderby,
        $top: input.top,
      },
    };

    const target = input.nextLink ?? "/me/chats";
    const opts = input.nextLink ? {} : options;

    return input.all
      ? client.collect(target, opts, input.maxPages ?? 10)
      : client.page(target, opts);
  },
};

export default listChats;
