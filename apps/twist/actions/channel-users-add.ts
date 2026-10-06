import type { ActionDefinition } from "@w6w/types";
import { idList, twist } from "../lib/client.ts";

/**
 * `POST /api/v3/channels/add_users`
 *
 * Add several people to a channel.
 */
interface Input {
  channelId: number;
  userIds: string;
}

const channelUsersAdd: ActionDefinition<Input> = {
  key: "channel-users-add",
  type: "perform",
  resource: "channel",
  title: "Add Users to Channel",
  description: "Add several people to a channel.",
  idempotent: true,
  params: [
    { key: "channelId", label: "Channel ID", type: "number", required: true },
    {
      key: "userIds",
      label: "User IDs",
      type: "string",
      required: true,
      hint: "Comma-separated user ids, e.g. 10073,10076.",
    },
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
      path: "/channels/add_users",
      params: { "id": input.channelId, "user_ids": idList(input.userIds) },
    });
  },
};

export default channelUsersAdd;
