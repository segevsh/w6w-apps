import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/channels/unfavorite`
 *
 * Unfavorite a channel.
 */
interface Input {
  channelId: number;
}

const channelUnfavorite: ActionDefinition<Input> = {
  key: "channel-unfavorite",
  type: "perform",
  resource: "channel",
  title: "Unfavorite Channel",
  description: "Unfavorite a channel.",
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
      path: "/channels/unfavorite",
      params: { "id": input.channelId },
    });
  },
};

export default channelUnfavorite;
