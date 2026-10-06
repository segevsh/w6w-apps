import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/channels/archive`
 *
 * Archive a channel.
 */
interface Input {
  channelId: number;
}

const channelArchive: ActionDefinition<Input> = {
  key: "channel-archive",
  type: "perform",
  resource: "channel",
  title: "Archive Channel",
  description: "Archive a channel.",
  idempotent: true,
  params: [
    { key: "channelId", label: "Channel ID", type: "number", required: true },
  ],
  output: [
    {
      key: "result",
      type: "string",
      label: "Twist's response when it is not an object (normally empty)",
    },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/channels/archive",
      params: { "id": input.channelId },
    });
  },
};

export default channelArchive;
