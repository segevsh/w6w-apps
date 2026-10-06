import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v4/workspace_users/update`
 *
 * Change a user's type in a workspace. Twist requires either an email or a user id.
 */
interface Input {
  workspaceId: number;
  userType: string;
  email?: string;
  userId?: number;
}

const workspaceUserUpdate: ActionDefinition<Input> = {
  key: "workspace-user-update",
  type: "perform",
  resource: "workspace-user",
  title: "Update Workspace User",
  description: "Change a user's type in a workspace. Twist requires either an email or a user id.",
  idempotent: true,
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
    {
      key: "userType",
      label: "User type",
      type: "select",
      required: true,
      options: [{ value: "USER", label: "USER" }, { value: "ADMIN", label: "ADMIN" }, {
        value: "GUEST",
        label: "GUEST",
      }],
    },
    { key: "email", label: "Email", type: "string", hint: "Required unless a user id is given." },
    { key: "userId", label: "User ID", type: "number", hint: "Required unless an email is given." },
  ],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "user_type", type: "string", label: "User type" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/workspace_users/update",
      version: 4,
      params: {
        "id": input.workspaceId,
        "user_type": input.userType,
        "email": input.email,
        "user_id": input.userId,
      },
    });
  },
};

export default workspaceUserUpdate;
