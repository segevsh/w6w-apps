import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/groups/remove`
 *
 * Delete a group.
 */
interface Input {
  groupId: number;
}

const groupRemove: ActionDefinition<Input> = {
  key: "group-remove",
  type: "perform",
  resource: "group",
  title: "Remove Group",
  description: "Delete a group.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "number", required: true },
  ],
  output: [
    {
      key: "result",
      type: "string",
      label: "Twist's response when it is not an object (normally empty)",
    },
  ],

  execute(input, ctx) {
    return twist(ctx, { method: "POST", path: "/groups/remove", params: { "id": input.groupId } });
  },
};

export default groupRemove;
