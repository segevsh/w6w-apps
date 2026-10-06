import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/conversations/unmute`
 *
 * Unmute a conversation.
 */
interface Input {
  conversationId: number;
}

const conversationUnmute: ActionDefinition<Input> = {
  key: "conversation-unmute",
  type: "perform",
  resource: "conversation",
  title: "Unmute Conversation",
  description: "Unmute a conversation.",
  idempotent: true,
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
      method: "POST",
      path: "/conversations/unmute",
      params: { "id": input.conversationId },
    });
  },
};

export default conversationUnmute;
