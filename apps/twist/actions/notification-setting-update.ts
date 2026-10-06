import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/notifications_settings/update`
 *
 * Change one notification setting.
 */
interface Input {
  workspaceId: number;
  setting: string;
  value: boolean;
}

const notificationSettingUpdate: ActionDefinition<Input> = {
  key: "notification-setting-update",
  type: "perform",
  resource: "notification",
  title: "Update Notification Setting",
  description: "Change one notification setting.",
  idempotent: true,
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      required: true,
      hint: "Twist workspace (team) id.",
    },
    {
      key: "setting",
      label: "Setting",
      type: "string",
      required: true,
      hint: "Setting name from Twist's notifications settings object.",
    },
    { key: "value", label: "Value", type: "boolean", required: true },
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
      path: "/notifications_settings/update",
      params: { "workspace_id": input.workspaceId, "setting": input.setting, "value": input.value },
    });
  },
};

export default notificationSettingUpdate;
