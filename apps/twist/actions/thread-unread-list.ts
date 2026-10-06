import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/threads/get_unread`
 *
 * List the user's unread threads in a workspace.
 */
interface Input {
  workspaceId: number;
}

const threadUnreadList: ActionDefinition<Input> = {
  key: "thread-unread-list",
  type: "read",
  resource: "thread",
  title: "List Unread Threads",
  description: "List the user's unread threads in a workspace.",
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
    { key: "items", type: "array", label: "Returned objects" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/threads/get_unread",
      params: { "workspace_id": input.workspaceId },
    });
  },
};

export default threadUnreadList;
