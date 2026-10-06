import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v4/workspace_users/resend_invite`
 *
 * Send the workspace invitation again.
 *
 * Not idempotent: a retry repeats the side effect.
 */
interface Input {
  workspaceId: number;
  email: string;
  userId?: number;
}

const workspaceUserInviteResend: ActionDefinition<Input> = {
  key: "workspace-user-invite-resend",
  type: "perform",
  resource: "workspace-user",
  title: "Resend Workspace Invite",
  description: "Send the workspace invitation again.",
  idempotent: false,
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
      path: "/workspace_users/resend_invite",
      version: 4,
      params: { "id": input.workspaceId, "email": input.email, "user_id": input.userId },
    });
  },
};

export default workspaceUserInviteResend;
