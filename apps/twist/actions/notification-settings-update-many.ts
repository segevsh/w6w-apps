import type { ActionDefinition } from "@w6w/types";
import { jsonValue, twist } from "../lib/client.ts";

/**
 * `POST /api/v3/notifications_settings/update_many`
 *
 * Change several notification settings at once.
 */
interface Input {
  workspaceId: number;
  mapping: unknown;
}

const notificationSettingsUpdateMany: ActionDefinition<Input> = {
  key: "notification-settings-update-many",
  type: "perform",
  resource: "notification",
  title: "Update Notification Settings",
  description: "Change several notification settings at once.",
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
      key: "mapping",
      label: "Mapping",
      type: "json",
      required: true,
      hint: 'JSON object of setting name to boolean, e.g. {"email_new_thread": false}.',
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
      path: "/notifications_settings/update_many",
      params: { "workspace_id": input.workspaceId, "mapping": jsonValue(input.mapping) },
    });
  },
};

export default notificationSettingsUpdateMany;
