import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/channels/unarchive`
 *
 * Unarchive a channel.
 */
interface Input {
  channelId: number;
}

const channelUnarchive: ActionDefinition<Input> = {
  key: "channel-unarchive",
  type: "perform",
  resource: "channel",
  title: "Unarchive Channel",
  description: "Unarchive a channel.",
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
      path: "/channels/unarchive",
      params: { "id": input.channelId },
    });
  },
};

export default channelUnarchive;
