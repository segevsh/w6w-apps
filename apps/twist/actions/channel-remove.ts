import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/channels/remove`
 *
 * Delete a channel. Twist requires it to be archived first.
 */
interface Input {
  channelId: number;
}

const channelRemove: ActionDefinition<Input> = {
  key: "channel-remove",
  type: "perform",
  resource: "channel",
  title: "Remove Channel",
  description: "Delete a channel. Twist requires it to be archived first.",
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
      path: "/channels/remove",
      params: { "id": input.channelId },
    });
  },
};

export default channelRemove;
