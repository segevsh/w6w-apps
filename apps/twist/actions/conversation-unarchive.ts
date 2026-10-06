import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/conversations/unarchive`
 *
 * Unarchive a conversation.
 */
interface Input {
  conversationId: number;
}

const conversationUnarchive: ActionDefinition<Input> = {
  key: "conversation-unarchive",
  type: "perform",
  resource: "conversation",
  title: "Unarchive Conversation",
  description: "Unarchive a conversation.",
  idempotent: true,
  params: [
    { key: "conversationId", label: "Conversation ID", type: "number", required: true },
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
      path: "/conversations/unarchive",
      params: { "id": input.conversationId },
    });
  },
};

export default conversationUnarchive;
