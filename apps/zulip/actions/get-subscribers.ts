import type { ActionDefinition } from "@w6w/types";
import { payload, seg, ZulipClient } from "../lib/client.ts";

interface Input {
  stream_id: number;
}

const getSubscribers: ActionDefinition<Input> = {
  key: "get-subscribers",
  type: "read",
  resource: "channel",
  title: "List Channel Subscribers",
  description: "List the user IDs subscribed to a channel (GET /streams/{stream_id}/members).",
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
      "key": "subscribers",
      "type": "array",
      "label": "Subscribed user IDs",
    },
  ],

  async execute(input, ctx) {
    const res = await new ZulipClient(ctx).request(
      "GET",
      `/streams/${seg(input.stream_id)}/members`,
    );
    return payload(res);
  },
};

export default getSubscribers;
