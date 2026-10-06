import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/conversations/update`
 *
 * Update a conversation's title or archived flag.
 */
interface Input {
  conversationId: number;
  title: string;
  archived?: boolean;
}

const conversationUpdate: ActionDefinition<Input> = {
  key: "conversation-update",
  type: "perform",
  resource: "conversation",
  title: "Update Conversation",
  description: "Update a conversation's title or archived flag.",
  idempotent: true,
  params: [
    { key: "conversationId", label: "Conversation ID", type: "number", required: true },
    { key: "title", label: "Title", type: "string", required: true },
    { key: "archived", label: "Archived", type: "boolean" },
  ],
  output: [
    { key: "id", type: "number", label: "Conversation ID" },
    { key: "workspace_id", type: "number", label: "Workspace ID" },
    { key: "title", type: "string", label: "Title" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/conversations/update",
      params: { "id": input.conversationId, "title": input.title, "archived": input.archived },
    });
  },
};

export default conversationUpdate;
