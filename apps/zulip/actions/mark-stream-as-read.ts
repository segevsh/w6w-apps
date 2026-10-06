import type { ActionDefinition } from "@w6w/types";
import { payload, ZulipClient } from "../lib/client.ts";

interface Input {
  stream_id: number;
}

const markStreamAsRead: ActionDefinition<Input> = {
  key: "mark-stream-as-read",
  type: "perform",
  resource: "message",
  title: "Mark Channel as Read",
  idempotent: true,
  description: "Mark every message in a channel as read (POST /mark_stream_as_read).",
  params: [
    {
      "key": "stream_id",
      "label": "Channel ID",
      "type": "number",
      "required": true,
      "hint": "Numeric channel ID. Find it with Get Channel ID or List Channels.",
    },
  ],
  output: [],

  async execute(input, ctx) {
    const res = await new ZulipClient(ctx).request("POST", "/mark_stream_as_read", {
      form: { stream_id: input.stream_id },
    });
    return payload(res);
  },
};

export default markStreamAsRead;
