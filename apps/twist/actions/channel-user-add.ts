import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/channels/add_user`
 *
 * Add a person to a channel.
 */
interface Input {
  channelId: number;
  userId: number;
}

const channelUserAdd: ActionDefinition<Input> = {
  key: "channel-user-add",
  type: "perform",
  resource: "channel",
  title: "Add User to Channel",
  description: "Add a person to a channel.",
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
      path: "/channels/add_user",
      params: { "id": input.channelId, "user_id": input.userId },
    });
  },
};

export default channelUserAdd;
