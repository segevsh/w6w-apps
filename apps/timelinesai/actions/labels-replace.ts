import type { ActionDefinition } from "@w6w/types";
import { seg, TimelinesClient, toList } from "../lib/client.ts";

interface Input {
  chatId: number;
  labels: string;
}

const labelsReplace: ActionDefinition<Input> = {
  key: "labels-replace",
  type: "perform",
  idempotent: true,
  resource: "label",
  title: "Replace Chat Labels",
  description:
    "Replace ALL of a chat's labels with the given set (POST /chats/{chat_id}/labels). The verb is counter-intuitive: POST replaces, PUT adds.",
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
    return new TimelinesClient(ctx).post(`/chats/${seg(input.chatId)}/labels`, { labels });
  },
};

export default labelsReplace;
