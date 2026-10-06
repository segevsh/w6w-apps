import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/channels/favorite`
 *
 * Favorite a channel.
 */
interface Input {
  channelId: number;
}

const channelFavorite: ActionDefinition<Input> = {
  key: "channel-favorite",
  type: "perform",
  resource: "channel",
  title: "Favorite Channel",
  description: "Favorite a channel.",
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
      path: "/channels/favorite",
      params: { "id": input.channelId },
    });
  },
};

export default channelFavorite;
