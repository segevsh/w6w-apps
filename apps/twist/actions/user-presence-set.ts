import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/users/heartbeat`
 *
 * Mark the user as active in a workspace.
 */
interface Input {
  workspaceId: number;
  platform: string;
}

const userPresenceSet: ActionDefinition<Input> = {
  key: "user-presence-set",
  type: "perform",
  resource: "user",
  title: "Set Presence",
  description: "Mark the user as active in a workspace.",
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
      key: "platform",
      label: "Platform",
      type: "select",
      required: true,
      hint: "Twist accepts mobile, desktop or api.",
      options: [{ value: "api", label: "api" }, { value: "desktop", label: "desktop" }, {
        value: "mobile",
        label: "mobile",
      }],
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
      path: "/users/heartbeat",
      params: { "workspace_id": input.workspaceId, "platform": input.platform },
    });
  },
};

export default userPresenceSet;
