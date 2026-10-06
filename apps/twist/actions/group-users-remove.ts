import type { ActionDefinition } from "@w6w/types";
import { idList, twist } from "../lib/client.ts";

/**
 * `POST /api/v3/groups/remove_users`
 *
 * Remove several people from a group.
 */
interface Input {
  groupId: number;
  userIds: string;
}

const groupUsersRemove: ActionDefinition<Input> = {
  key: "group-users-remove",
  type: "perform",
  resource: "group",
  title: "Remove Users from Group",
  description: "Remove several people from a group.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "number", required: true },
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
      path: "/groups/remove_users",
      params: { "id": input.groupId, "user_ids": idList(input.userIds) },
    });
  },
};

export default groupUsersRemove;
