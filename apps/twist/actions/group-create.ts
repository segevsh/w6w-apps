import type { ActionDefinition } from "@w6w/types";
import { idList, twist } from "../lib/client.ts";

/**
 * `POST /api/v3/groups/add`
 *
 * Create a group in a workspace.
 *
 * Not idempotent: a retry repeats the side effect.
 */
interface Input {
  workspaceId: number;
  name: string;
  userIds?: string;
}

const groupCreate: ActionDefinition<Input> = {
  key: "group-create",
  type: "perform",
  resource: "group",
  title: "Create Group",
  description: "Create a group in a workspace.",
  idempotent: false,
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      required: true,
      hint: "Twist workspace (team) id.",
    },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "userIds",
      label: "User IDs",
      type: "string",
      hint: "Comma-separated ids of the group's members.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/groups/add",
      params: {
        "workspace_id": input.workspaceId,
        "name": input.name,
        "user_ids": idList(input.userIds),
      },
    });
  },
};

export default groupCreate;
