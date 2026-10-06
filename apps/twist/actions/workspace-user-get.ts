import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v4/workspace_users/getone`
 *
 * Get a workspace user by id.
 */
interface Input {
  workspaceId: number;
  userId: number;
}

const workspaceUserGet: ActionDefinition<Input> = {
  key: "workspace-user-get",
  type: "read",
  resource: "workspace-user",
  title: "Get Workspace User",
  description: "Get a workspace user by id.",
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
    { key: "userId", label: "User ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "user_type", type: "string", label: "User type" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/workspace_users/getone",
      version: 4,
      params: { "id": input.workspaceId, "user_id": input.userId },
    });
  },
};

export default workspaceUserGet;
