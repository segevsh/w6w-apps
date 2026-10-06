import type { ActionDefinition } from "@w6w/types";
import { seg, TimelinesClient } from "../lib/client.ts";

interface Input {
  chatId: number;
  fromMe?: boolean;
  after?: string;
  before?: string;
  afterMessage?: string;
  beforeMessage?: string;
  sortingOrder?: string;
}

const messagesList: ActionDefinition<Input> = {
  key: "messages-list",
  type: "read",
  resource: "message",
  title: "List Messages",
  description:
    "A chat's message history, newest first, 50 per page (GET /chats/{chat_id}/messages). The reference documents no page parameter; page with the message cursors.",
  params: [
    {
      "key": "chatId",
      "label": "Chat ID",
      "type": "number",
      "required": true,
      "hint":
        "The numeric chat id — from List Chats, the chat's URL in TimelinesAI, or a webhook payload.",
    },
    {
      "key": "fromMe",
      "label": "Sent by me",
      "type": "boolean",
      "hint": "true = messages sent from your WhatsApp account, false = received, unset = both.",
    },
    {
      "key": "after",
      "label": "After (date)",
      "type": "string",
      "hint": "ISO date or datetime, inclusive.",
    },
    {
      "key": "before",
      "label": "Before (date)",
      "type": "string",
      "hint": "ISO date or datetime, inclusive.",
    },
    {
      "key": "afterMessage",
      "label": "After message UID",
      "type": "string",
      "hint": "Only messages after this one (exclusive). The cursor for paging forward.",
    },
    {
      "key": "beforeMessage",
      "label": "Before message UID",
      "type": "string",
      "hint": "Only messages before this one (exclusive). The cursor for paging back.",
    },
    {
      "key": "sortingOrder",
      "label": "Sort order",
      "type": "select",
      "hint": "By timestamp. Default desc.",
      "options": [
        {
          "value": "asc",
          "label": "asc",
        },
        {
          "value": "desc",
          "label": "desc",
        },
      ],
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label:
        "has_more_pages and messages[]: uid, chat_id, timestamp, from_me, text, status, message_type, attachment_url \u2026",
    },
  ],

  execute(input, ctx) {
    return new TimelinesClient(ctx).get(`/chats/${seg(input.chatId)}/messages`, {
      from_me: input.fromMe,
      after: input.after,
      before: input.before,
      after_message: input.afterMessage,
      before_message: input.beforeMessage,
      sorting_order: input.sortingOrder,
    });
  },
};

export default messagesList;
