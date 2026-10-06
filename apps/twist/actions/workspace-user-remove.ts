import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v4/workspace_users/remove`
 *
 * Remove a person from a workspace.
 */
interface Input {
  workspaceId: number;
  email: string;
  userId?: number;
}

const workspaceUserRemove: ActionDefinition<Input> = {
  key: "workspace-user-remove",
  type: "perform",
  resource: "workspace-user",
  title: "Remove User from Workspace",
  description: "Remove a person from a workspace.",
  idempotent: true,
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "userId",
      label: "User ID",
      type: "number",
      hint: "If given, used instead of the email.",
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
      path: "/workspace_users/remove",
      version: 4,
      params: { "id": input.workspaceId, "email": input.email, "user_id": input.userId },
    });
  },
};

export default workspaceUserRemove;
