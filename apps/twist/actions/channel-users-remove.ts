import type { ActionDefinition } from "@w6w/types";
import { idList, twist } from "../lib/client.ts";

/**
 * `POST /api/v3/channels/remove_users`
 *
 * Remove several people from a channel.
 */
interface Input {
  channelId: number;
  userIds: string;
}

const channelUsersRemove: ActionDefinition<Input> = {
  key: "channel-users-remove",
  type: "perform",
  resource: "channel",
  title: "Remove Users from Channel",
  description: "Remove several people from a channel.",
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
      path: "/channels/remove_users",
      params: { "id": input.channelId, "user_ids": idList(input.userIds) },
    });
  },
};

export default channelUsersRemove;
