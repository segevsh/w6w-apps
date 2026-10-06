import type { ActionDefinition } from "@w6w/types";
import { type Params, payload, seg, ZulipClient } from "../lib/client.ts";

interface Input {
  message_id: number;
  content?: string;
  topic?: string;
  stream_id?: number;
  propagate_mode?: "change_one" | "change_later" | "change_all";
  send_notification_to_old_thread?: boolean;
  send_notification_to_new_thread?: boolean;
}

const updateMessage: ActionDefinition<Input> = {
  key: "update-message",
  type: "perform",
  resource: "message",
  title: "Edit or Move Message",
  idempotent: true,
  description:
    "Edit a message's content, rename its topic or move it to another channel (PATCH /messages/{message_id}). Subject to the organization's edit and move time limits and permissions.",
  params: [
    {
      "key": "message_id",
      "label": "Message ID",
      "type": "number",
      "required": true,
    },
    {
      "key": "content",
      "label": "New content",
      "type": "text",
    },
    {
      "key": "topic",
      "label": "New topic",
      "type": "string",
    },
    {
      "key": "stream_id",
      "label": "Move to channel ID",
      "type": "number",
    },
    {
      "key": "propagate_mode",
      "label": "Apply topic change to",
      "type": "select",
      "hint": "Default: this message only.",
      "options": [
        {
          "value": "change_one",
          "label": "change_one",
        },
        {
          "value": "change_later",
          "label": "change_later",
        },
        {
          "value": "change_all",
          "label": "change_all",
        },
      ],
    },
    {
      "key": "send_notification_to_old_thread",
      "label": "Notify old topic",
      "type": "boolean",
    },
    {
      "key": "send_notification_to_new_thread",
      "label": "Notify new topic",
      "type": "boolean",
    },
  ],
  output: [],

  async execute(input, ctx) {
    const { message_id: _id, ...fields } = input;
    const form: Params = { ...fields };
    if (form.content === undefined && form.topic === undefined && form.stream_id === undefined) {
      throw new Error("update-message: set at least one of content, topic or stream_id");
    }
    const res = await new ZulipClient(ctx).request("PATCH", `/messages/${seg(input.message_id)}`, {
      form,
    });
    return payload(res);
  },
};

export default updateMessage;
