import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/groups/update`
 *
 * Rename a group.
 */
interface Input {
  groupId: number;
  name: string;
}

const groupUpdate: ActionDefinition<Input> = {
  key: "group-update",
  type: "perform",
  resource: "group",
  title: "Update Group",
  description: "Rename a group.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/groups/update",
      params: { "id": input.groupId, "name": input.name },
    });
  },
};

export default groupUpdate;
