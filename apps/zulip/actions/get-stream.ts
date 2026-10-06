import type { ActionDefinition } from "@w6w/types";
import { payload, seg, ZulipClient } from "../lib/client.ts";

interface Input {
  stream_id: number;
}

const getStream: ActionDefinition<Input> = {
  key: "get-stream",
  type: "read",
  resource: "channel",
  title: "Get Channel",
  description: "Fetch one channel by ID (GET /streams/{stream_id}).",
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
      "key": "stream",
      "type": "object",
      "label": "The channel",
    },
  ],

  async execute(input, ctx) {
    const res = await new ZulipClient(ctx).request("GET", `/streams/${seg(input.stream_id)}`);
    return payload(res);
  },
};

export default getStream;
