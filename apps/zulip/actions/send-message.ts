import type { ActionDefinition } from "@w6w/types";
import { idOrEmailList, payload, ZulipClient } from "../lib/client.ts";

interface Input {
  type: "channel" | "direct";
  to: string;
  content: string;
  topic?: string;
  read_by_sender?: boolean;
}

const sendMessage: ActionDefinition<Input> = {
  key: "send-message",
  type: "perform",
  resource: "message",
  title: "Send Message",
  idempotent: false,
  description: "Send a message to a channel topic or as a direct message (POST /messages).",
  params: [
    {
      "key": "type",
      "label": "Message type",
      "type": "select",
      "required": true,
      "options": [
        {
          "value": "channel",
          "label": "channel",
        },
        {
          "value": "direct",
          "label": "direct",
        },
      ],
    },
    {
      "key": "to",
      "label": "To",
      "type": "string",
      "required": true,
      "hint":
        "Channel: its name or numeric ID. Direct: comma-separated user IDs or Zulip API emails.",
    },
    {
      "key": "content",
      "label": "Content",
      "type": "text",
      "required": true,
      "hint": "Zulip-flavoured Markdown.",
    },
    {
      "key": "topic",
      "label": "Topic",
      "type": "string",
      "hint": "Channel messages only; ignored for direct messages.",
    },
    {
      "key": "read_by_sender",
      "label": "Mark read for sender",
      "type": "boolean",
    },
  ],
  output: [
    {
      "key": "id",
      "type": "number",
      "label": "ID of the new message",
    },
    {
      "key": "message_url",
      "type": "string",
      "label": "Relative URL of the message",
    },
    {
      "key": "message_link",
      "type": "string",
      "label": "Link to the message",
    },
  ],

  async execute(input, ctx) {
    const direct = input.type === "direct";
    const to = direct ? idOrEmailList(input.to) : String(input.to ?? "").trim();
    if (!to || (Array.isArray(to) && to.length === 0)) {
      throw new Error("send-message: `to` is required");
    }
    const res = await new ZulipClient(ctx).request("POST", "/messages", {
      form: {
        type: direct ? "direct" : "stream",
        to,
        content: input.content,
        topic: direct ? undefined : input.topic,
        read_by_sender: input.read_by_sender,
      },
    });
    return payload(res);
  },
};

export default sendMessage;
