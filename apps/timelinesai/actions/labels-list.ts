import type { ActionDefinition } from "@w6w/types";
import { seg, TimelinesClient } from "../lib/client.ts";

interface Input {
  chatId: number;
}

const labelsList: ActionDefinition<Input> = {
  key: "labels-list",
  type: "read",
  resource: "label",
  title: "List Chat Labels",
  description: "The labels on a chat (GET /chats/{chat_id}/labels).",
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
    { key: "data", type: "object", label: "labels[] \u2014 label names" },
  ],

  execute(input, ctx) {
    return new TimelinesClient(ctx).get(`/chats/${seg(input.chatId)}/labels`);
  },
};

export default labelsList;
