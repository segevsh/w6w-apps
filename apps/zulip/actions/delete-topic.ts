import type { ActionDefinition } from "@w6w/types";
import { payload, seg, ZulipClient } from "../lib/client.ts";

interface Input {
  stream_id: number;
  topic_name: string;
}

const deleteTopic: ActionDefinition<Input> = {
  key: "delete-topic",
  type: "perform",
  resource: "topic",
  title: "Delete Topic",
  idempotent: true,
  description:
    "Delete every message in a topic (POST /streams/{stream_id}/delete_topic). Administrators only. Deletion runs in batches: when `complete` is false, run it again.",
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
  output: [
    {
      "key": "complete",
      "type": "boolean",
      "label": "False means messages remain; run again",
    },
  ],

  async execute(input, ctx) {
    const res = await new ZulipClient(ctx).request(
      "POST",
      `/streams/${seg(input.stream_id)}/delete_topic`,
      { form: { topic_name: input.topic_name } },
    );
    return payload(res);
  },
};

export default deleteTopic;
