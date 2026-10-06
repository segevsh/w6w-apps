import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/notifications_settings/get`
 *
 * Get the user's notification settings for a workspace.
 */
interface Input {
  workspaceId: number;
}

const notificationSettingsGet: ActionDefinition<Input> = {
  key: "notification-settings-get",
  type: "read",
  resource: "notification",
  title: "Get Notification Settings",
  description: "Get the user's notification settings for a workspace.",
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
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
      path: "/notifications_settings/get",
      params: { "workspace_id": input.workspaceId },
    });
  },
};

export default notificationSettingsGet;
