import type { ActionDefinition } from "@w6w/types";
import { idList, twist } from "../lib/client.ts";

/**
 * `POST /api/v3/conversations/add_users`
 *
 * Add several people to a conversation.
 */
interface Input {
  conversationId: number;
  userIds: string;
}

const conversationUsersAdd: ActionDefinition<Input> = {
  key: "conversation-users-add",
  type: "perform",
  resource: "conversation",
  title: "Add Users to Conversation",
  description: "Add several people to a conversation.",
  idempotent: true,
  params: [
    { key: "conversationId", label: "Conversation ID", type: "number", required: true },
    {
      key: "userIds",
      label: "User IDs",
      type: "string",
      required: true,
      hint: "Comma-separated user ids, e.g. 10073,10076.",
    },
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
      path: "/conversations/add_users",
      params: { "id": input.conversationId, "user_ids": idList(input.userIds) },
    });
  },
};

export default conversationUsersAdd;
