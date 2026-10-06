import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v4/workspace_users/get_local_time`
 *
 * Get a user's local time. Twist answers a bare date-time string, returned as `result`.
 */
interface Input {
  workspaceId: number;
  userId: number;
}

const workspaceUserLocalTimeGet: ActionDefinition<Input> = {
  key: "workspace-user-local-time-get",
  type: "read",
  resource: "workspace-user",
  title: "Get User Local Time",
  description:
    "Get a user's local time. Twist answers a bare date-time string, returned as `result`.",
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
    { key: "userId", label: "User ID", type: "number", required: true },
  ],
  output: [
    { key: "result", type: "string", label: "Returned value" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/workspace_users/get_local_time",
      version: 4,
      params: { "id": input.workspaceId, "user_id": input.userId },
    });
  },
};

export default workspaceUserLocalTimeGet;
