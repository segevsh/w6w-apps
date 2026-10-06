import type { ActionDefinition } from "@w6w/types";
import { seg, TimelinesClient } from "../lib/client.ts";

interface Input {
  chatId: number;
}

const chatGet: ActionDefinition<Input> = {
  key: "chat-get",
  type: "read",
  resource: "chat",
  title: "Get Chat",
  description: "Get one chat's details (GET /chats/{chat_id}).",
  params: [
    {
      "key": "chatId",
      "label": "Chat ID",
      "type": "number",
      "required": true,
      "hint":
        "The numeric chat id — from List Chats, the chat's URL in TimelinesAI, or a webhook payload.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "The chat: id, name, phone, jid, labels, responsible_email, last_message \u2026",
    },
  ],

  execute(input, ctx) {
    return new TimelinesClient(ctx).get(`/chats/${seg(input.chatId)}`);
  },
};

export default chatGet;
