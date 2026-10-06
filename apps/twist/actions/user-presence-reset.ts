import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/users/reset_presence`
 *
 * Reset the user's presence in a workspace.
 */
interface Input {
  workspaceId: number;
}

const userPresenceReset: ActionDefinition<Input> = {
  key: "user-presence-reset",
  type: "perform",
  resource: "user",
  title: "Reset Presence",
  description: "Reset the user's presence in a workspace.",
  idempotent: true,
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      required: true,
      hint: "Twist workspace (team) id.",
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
      path: "/users/reset_presence",
      params: { "workspace_id": input.workspaceId },
    });
  },
};

export default userPresenceReset;
