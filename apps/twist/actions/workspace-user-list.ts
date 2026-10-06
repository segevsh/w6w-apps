import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v4/workspace_users/get`
 *
 * List the users of a workspace. Uses /api/v4; the v3 endpoint is deprecated.
 */
interface Input {
  workspaceId: number;
}

const workspaceUserList: ActionDefinition<Input> = {
  key: "workspace-user-list",
  type: "read",
  resource: "workspace-user",
  title: "List Workspace Users",
  description: "List the users of a workspace. Uses /api/v4; the v3 endpoint is deprecated.",
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
  ],
  output: [
    { key: "items", type: "array", label: "Returned objects" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/workspace_users/get",
      version: 4,
      params: { "id": input.workspaceId },
    });
  },
};

export default workspaceUserList;
