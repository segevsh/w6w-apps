import type { ActionDefinition } from "@w6w/types";
import { payload, ZulipClient } from "../lib/client.ts";

interface Input {
  stream: string;
}

const getStreamId: ActionDefinition<Input> = {
  key: "get-stream-id",
  type: "read",
  resource: "channel",
  title: "Get Channel ID",
  description: "Look up a channel's numeric ID from its name (GET /get_stream_id).",
  params: [
    {
      "key": "stream",
      "label": "Channel name",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    {
      "key": "stream_id",
      "type": "number",
      "label": "The channel ID",
    },
  ],

  async execute(input, ctx) {
    const res = await new ZulipClient(ctx).request("GET", "/get_stream_id", {
      query: { stream: input.stream },
    });
    return payload(res);
  },
};

export default getStreamId;
