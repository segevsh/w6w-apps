import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/groups/add_user`
 *
 * Add a person to a group.
 */
interface Input {
  groupId: number;
  userId: number;
}

const groupUserAdd: ActionDefinition<Input> = {
  key: "group-user-add",
  type: "perform",
  resource: "group",
  title: "Add User to Group",
  description: "Add a person to a group.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "number", required: true },
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
      path: "/groups/add_user",
      params: { "id": input.groupId, "user_id": input.userId },
    });
  },
};

export default groupUserAdd;
