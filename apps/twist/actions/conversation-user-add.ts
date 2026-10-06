import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/conversations/add_user`
 *
 * Add a person to a conversation.
 */
interface Input {
  conversationId: number;
  userId: number;
}

const conversationUserAdd: ActionDefinition<Input> = {
  key: "conversation-user-add",
  type: "perform",
  resource: "conversation",
  title: "Add User to Conversation",
  description: "Add a person to a conversation.",
  idempotent: true,
  params: [
    { key: "conversationId", label: "Conversation ID", type: "number", required: true },
    { key: "userId", label: "User ID", type: "number", required: true },
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
      path: "/conversations/add_user",
      params: { "id": input.conversationId, "user_id": input.userId },
    });
  },
};

export default conversationUserAdd;
