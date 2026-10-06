import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/url_join/disable`
 *
 * Disable a workspace's URL join link.
 */
interface Input {
  workspaceId: number;
}

const urlJoinDisable: ActionDefinition<Input> = {
  key: "url-join-disable",
  type: "perform",
  resource: "workspace",
  title: "Disable Join Link",
  description: "Disable a workspace's URL join link.",
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
      path: "/url_join/disable",
      params: { "workspace_id": input.workspaceId },
    });
  },
};

export default urlJoinDisable;
