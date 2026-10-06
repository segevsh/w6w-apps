import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/channels/remove_user`
 *
 * Remove a person from a channel.
 */
interface Input {
  channelId: number;
  userId: number;
}

const channelUserRemove: ActionDefinition<Input> = {
  key: "channel-user-remove",
  type: "perform",
  resource: "channel",
  title: "Remove User from Channel",
  description: "Remove a person from a channel.",
  idempotent: true,
  params: [
    { key: "channelId", label: "Channel ID", type: "number", required: true },
    { key: "userId", label: "User ID", type: "number", required: true },
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
      path: "/channels/remove_user",
      params: { "id": input.channelId, "user_id": input.userId },
    });
  },
};

export default channelUserRemove;
