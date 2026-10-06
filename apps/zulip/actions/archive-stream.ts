import type { ActionDefinition } from "@w6w/types";
import { payload, seg, ZulipClient } from "../lib/client.ts";

interface Input {
  stream_id: number;
}

const archiveStream: ActionDefinition<Input> = {
  key: "archive-stream",
  type: "perform",
  resource: "channel",
  title: "Archive Channel",
  idempotent: true,
  description:
    "Archive a channel (DELETE /streams/{stream_id}); its messages stay readable. Needs channel-administration permission.",
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
    const res = await new ZulipClient(ctx).request("DELETE", `/streams/${seg(input.stream_id)}`);
    return payload(res);
  },
};

export default archiveStream;
