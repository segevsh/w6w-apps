import type { ActionDefinition } from "@w6w/types";
import { payload, ZulipClient } from "../lib/client.ts";

interface Input {
  stream_id: number;
  topic_name: string;
}

const markTopicAsRead: ActionDefinition<Input> = {
  key: "mark-topic-as-read",
  type: "perform",
  resource: "message",
  title: "Mark Topic as Read",
  idempotent: true,
  description: "Mark every message in one topic as read (POST /mark_topic_as_read).",
  params: [
    {
      "key": "stream_id",
      "label": "Channel ID",
      "type": "number",
      "required": true,
      "hint": "Numeric channel ID. Find it with Get Channel ID or List Channels.",
    },
    {
      "key": "topic_name",
      "label": "Topic",
      "type": "string",
      "required": true,
    },
  ],
  output: [],

  async execute(input, ctx) {
    const res = await new ZulipClient(ctx).request("POST", "/mark_topic_as_read", {
      form: { stream_id: input.stream_id, topic_name: input.topic_name },
    });
    return payload(res);
  },
};

export default markTopicAsRead;
