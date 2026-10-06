import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  channelId: string;
}

/** Fetch one channel by ID. */
const channelGet: ActionDefinition<Input> = {
  key: "channel-get",
  type: "read",
  resource: "channel",
  title: "Get Channel",
  description: "Fetch one channel by ID.",
  params: [
    { "key": "channelId", "label": "Channel ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/channels/${seg(input.channelId)}`);
  },
};

export default channelGet;
