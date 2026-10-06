import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v4/workspace_users/get_ids`
 *
 * List the user ids of a workspace.
 */
interface Input {
  workspaceId: number;
}

const workspaceUserIdsList: ActionDefinition<Input> = {
  key: "workspace-user-ids-list",
  type: "read",
  resource: "workspace-user",
  title: "List Workspace User IDs",
  description: "List the user ids of a workspace.",
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
  ],
  output: [
    { key: "items", type: "array", label: "Returned objects" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/workspace_users/get_ids",
      version: 4,
      params: { "id": input.workspaceId },
    });
  },
};

export default workspaceUserIdsList;
