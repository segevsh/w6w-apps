import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/inbox/get_count`
 *
 * Get the inbox count for a workspace.
 */
interface Input {
  workspaceId: number;
}

const inboxCountGet: ActionDefinition<Input> = {
  key: "inbox-count-get",
  type: "read",
  resource: "inbox",
  title: "Get Inbox Count",
  description: "Get the inbox count for a workspace.",
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
    { key: "data", type: "object", label: "Inbox counts" },
    { key: "version", type: "number", label: "Version of the counts" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/inbox/get_count",
      params: { "workspace_id": input.workspaceId },
    });
  },
};

export default inboxCountGet;
