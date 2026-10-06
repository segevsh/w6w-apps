import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/conversations/get_unread`
 *
 * List the user's unread conversations in a workspace.
 */
interface Input {
  workspaceId: number;
}

const conversationUnreadList: ActionDefinition<Input> = {
  key: "conversation-unread-list",
  type: "read",
  resource: "conversation",
  title: "List Unread Conversations",
  description: "List the user's unread conversations in a workspace.",
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
      path: "/conversations/get_unread",
      params: { "workspace_id": input.workspaceId },
    });
  },
};

export default conversationUnreadList;
