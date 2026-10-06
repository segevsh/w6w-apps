import type { ActionDefinition } from "@w6w/types";
import { compact, seg, TimelinesClient } from "../lib/client.ts";

interface Input {
  chatId: number;
  name?: string;
  responsible?: string;
  closed?: boolean;
  read?: boolean;
  chatgptAutoresponseEnabled?: boolean;
}

const chatUpdate: ActionDefinition<Input> = {
  key: "chat-update",
  type: "perform",
  idempotent: true,
  resource: "chat",
  title: "Update Chat",
  description:
    "Rename a chat, assign a responsible teammate, close or reopen it, or change its read state (PATCH /chats/{chat_id}). Only the fields you set change.",
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
      "key": "name",
      "label": "Name",
      "type": "string",
      "hint": "New chat name.",
    },
    {
      "key": "responsible",
      "label": "Responsible",
      "type": "string",
      "hint": "Email of the teammate to assign.",
    },
    {
      "key": "closed",
      "label": "Closed",
      "type": "boolean",
      "hint": "true closes the chat, false reopens it.",
    },
    {
      "key": "read",
      "label": "Read",
      "type": "boolean",
      "hint": "true marks read, false marks unread.",
    },
    {
      "key": "chatgptAutoresponseEnabled",
      "label": "ChatGPT auto-response",
      "type": "boolean",
      "hint": "Enable or disable the auto-response.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The updated chat" },
  ],

  execute(input, ctx) {
    const body = compact({
      name: input.name,
      responsible: input.responsible,
      closed: input.closed,
      read: input.read,
      chatgpt_autoresponse_enabled: input.chatgptAutoresponseEnabled,
    });
    if (Object.keys(body).length === 0) throw new Error("set at least one field to update");
    return new TimelinesClient(ctx).patch(`/chats/${seg(input.chatId)}`, body);
  },
};

export default chatUpdate;
