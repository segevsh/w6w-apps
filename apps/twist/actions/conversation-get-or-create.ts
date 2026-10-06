import type { ActionDefinition } from "@w6w/types";
import { idList, twist } from "../lib/client.ts";

/**
 * `POST /api/v3/conversations/get_or_create`
 *
 * Get the conversation with a set of users, creating it if it does not exist.
 */
interface Input {
  workspaceId: number;
  userIds: string;
}

const conversationGetOrCreate: ActionDefinition<Input> = {
  key: "conversation-get-or-create",
  type: "perform",
  resource: "conversation",
  title: "Get or Create Conversation",
  description: "Get the conversation with a set of users, creating it if it does not exist.",
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
      key: "userIds",
      label: "User IDs",
      type: "string",
      required: true,
      hint: "Comma-separated user ids, e.g. 10073,10076.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Conversation ID" },
    { key: "workspace_id", type: "number", label: "Workspace ID" },
    { key: "title", type: "string", label: "Title" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/conversations/get_or_create",
      params: { "workspace_id": input.workspaceId, "user_ids": idList(input.userIds) },
    });
  },
};

export default conversationGetOrCreate;
