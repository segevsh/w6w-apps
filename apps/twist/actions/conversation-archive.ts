import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/conversations/archive`
 *
 * Archive a conversation.
 */
interface Input {
  conversationId: number;
}

const conversationArchive: ActionDefinition<Input> = {
  key: "conversation-archive",
  type: "perform",
  resource: "conversation",
  title: "Archive Conversation",
  description: "Archive a conversation.",
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
      path: "/conversations/archive",
      params: { "id": input.conversationId },
    });
  },
};

export default conversationArchive;
