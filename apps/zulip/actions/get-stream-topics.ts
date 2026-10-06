import type { ActionDefinition } from "@w6w/types";
import { payload, seg, ZulipClient } from "../lib/client.ts";

interface Input {
  stream_id: number;
}

const getStreamTopics: ActionDefinition<Input> = {
  key: "get-stream-topics",
  type: "read",
  resource: "topic",
  title: "List Topics",
  description:
    "List the topics in a channel the user can access, with each one's latest message id (GET /users/me/{stream_id}/topics).",
  params: [
    {
      "key": "stream_id",
      "label": "Channel ID",
      "type": "number",
      "required": true,
      "hint": "Numeric channel ID. Find it with Get Channel ID or List Channels.",
    },
  ],
  output: [
    {
      "key": "topics",
      "type": "array",
      "label": "Topics: name and max_id (latest message ID)",
    },
  ],

  async execute(input, ctx) {
    const res = await new ZulipClient(ctx).request(
      "GET",
      `/users/me/${seg(input.stream_id)}/topics`,
    );
    return payload(res);
  },
};

export default getStreamTopics;
