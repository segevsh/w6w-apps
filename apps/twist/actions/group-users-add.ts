import type { ActionDefinition } from "@w6w/types";
import { idList, twist } from "../lib/client.ts";

/**
 * `POST /api/v3/groups/add_users`
 *
 * Add several people to a group.
 */
interface Input {
  groupId: number;
  userIds: string;
}

const groupUsersAdd: ActionDefinition<Input> = {
  key: "group-users-add",
  type: "perform",
  resource: "group",
  title: "Add Users to Group",
  description: "Add several people to a group.",
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
      path: "/groups/add_users",
      params: { "id": input.groupId, "user_ids": idList(input.userIds) },
    });
  },
};

export default groupUsersAdd;
