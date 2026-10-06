import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/conversations/getone`
 *
 * Get a conversation by id.
 */
interface Input {
  conversationId: number;
}

const conversationGet: ActionDefinition<Input> = {
  key: "conversation-get",
  type: "read",
  resource: "conversation",
  title: "Get Conversation",
  description: "Get a conversation by id.",
  params: [
    { key: "conversationId", label: "Conversation ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Conversation ID" },
    { key: "workspace_id", type: "number", label: "Workspace ID" },
    { key: "title", type: "string", label: "Title" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/conversations/getone",
      params: { "id": input.conversationId },
    });
  },
};

export default conversationGet;
