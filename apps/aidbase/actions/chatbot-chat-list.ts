import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * List Chats — List the conversations a chatbot has had, optionally within a date range. Paginated.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  chatbotId: string;
  createdBefore?: string;
  createdAfter?: string;
  limit?: number;
  nextCursor?: string;
}

const chatbotChatList: ActionDefinition<Input> = {
  key: "chatbot-chat-list",
  type: "read",
  resource: "chat",
  title: "List Chats",
  description:
    "List the conversations a chatbot has had, optionally within a date range. Paginated.",
  params: [
    {
      "key": "chatbotId",
      "label": "Chatbot ID",
      "type": "string",
      "required": true,
      "hint": "The chatbot's public ID (`public_id` from List Chatbots).",
    },
    {
      "key": "createdBefore",
      "label": "Created before",
      "type": "string",
      "hint":
        "Only chats created before this time (ISO 8601 or a date such as 2026-02-01). Aidbase answers 400 on an invalid date.",
    },
    {
      "key": "createdAfter",
      "label": "Created after",
      "type": "string",
      "hint":
        "Only chats created after this time (ISO 8601 or a date such as 2026-01-01). Aidbase answers 400 on an invalid date.",
    },
    {
      "key": "limit",
      "label": "Page size",
      "type": "number",
      "hint": "Items per page (Aidbase default 25).",
    },
    {
      "key": "nextCursor",
      "label": "Cursor",
      "type": "string",
      "hint": "`nextCursor` from the previous page, to fetch the next one.",
    },
  ],
  output: [
    {
      "key": "items",
      "type": "array",
      "label": "Items on this page",
    },
    {
      "key": "total",
      "type": "number",
      "label": "Total items matching",
    },
    {
      "key": "hasMore",
      "type": "boolean",
      "label": "True when another page exists",
    },
    {
      "key": "nextCursor",
      "type": "string",
      "label": "Cursor for the next page, null on the last page",
    },
    {
      "key": "count",
      "type": "number",
      "label": "Items on this page",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).page(`/chatbot/${encodeId(input.chatbotId)}/chats`, {
      query: {
        created_before: input.createdBefore,
        created_after: input.createdAfter,
        limit: input.limit,
        next_cursor: input.nextCursor,
      },
    });
  },
};

export default chatbotChatList;
