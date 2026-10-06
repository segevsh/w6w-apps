import type { ActionDefinition } from "@w6w/types";
import { seg, TimelinesClient, toList } from "../lib/client.ts";

interface Input {
  chatId: number;
  labels: string;
}

const labelsAdd: ActionDefinition<Input> = {
  key: "labels-add",
  type: "perform",
  idempotent: true,
  resource: "label",
  title: "Add Labels to Chat",
  description:
    "Add labels to a chat without removing the existing ones (PUT /chats/{chat_id}/labels). The verb is counter-intuitive: PUT adds, POST replaces.",
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
      "key": "labels",
      "label": "Labels",
      "type": "string",
      "required": true,
      "hint":
        "Comma- or newline-separated label names (max 64 chars each); missing labels are created.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "labels[] \u2014 the chat's labels after the change" },
  ],

  execute(input, ctx) {
    const labels = toList(input.labels);
    if (labels.length === 0) throw new Error("`labels` is empty");
    return new TimelinesClient(ctx).put(`/chats/${seg(input.chatId)}/labels`, { labels });
  },
};

export default labelsAdd;
