import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v4/workspace_users/get_info`
 *
 * Get a user's info in the context of a workspace.
 */
interface Input {
  workspaceId: number;
  userId: number;
}

const workspaceUserInfoGet: ActionDefinition<Input> = {
  key: "workspace-user-info-get",
  type: "read",
  resource: "workspace-user",
  title: "Get Workspace User Info",
  description: "Get a user's info in the context of a workspace.",
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
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
      method: "GET",
      path: "/workspace_users/get_info",
      version: 4,
      params: { "id": input.workspaceId, "user_id": input.userId },
    });
  },
};

export default workspaceUserInfoGet;
