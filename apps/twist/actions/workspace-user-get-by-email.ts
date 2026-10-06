import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v4/workspace_users/get_by_email`
 *
 * Get a workspace user by email address.
 */
interface Input {
  workspaceId: number;
  email: string;
}

const workspaceUserGetByEmail: ActionDefinition<Input> = {
  key: "workspace-user-get-by-email",
  type: "read",
  resource: "workspace-user",
  title: "Get Workspace User by Email",
  description: "Get a workspace user by email address.",
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
    { key: "email", label: "Email", type: "string", required: true },
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
      path: "/workspace_users/get_by_email",
      version: 4,
      params: { "id": input.workspaceId, "email": input.email },
    });
  },
};

export default workspaceUserGetByEmail;
