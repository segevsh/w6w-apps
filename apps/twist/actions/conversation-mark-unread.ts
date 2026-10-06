import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/conversations/mark_unread`
 *
 * Mark a conversation as unread. Give a message id or an object index.
 */
interface Input {
  conversationId: number;
  objIndex?: number;
  messageId?: number;
}

const conversationMarkUnread: ActionDefinition<Input> = {
  key: "conversation-mark-unread",
  type: "perform",
  resource: "conversation",
  title: "Mark Conversation Unread",
  description: "Mark a conversation as unread. Give a message id or an object index.",
  idempotent: true,
  params: [
    { key: "conversationId", label: "Conversation ID", type: "number", required: true },
    {
      key: "objIndex",
      label: "Object index",
      type: "number",
      hint: "Required unless a message id is given.",
    },
    {
      key: "messageId",
      label: "Message ID",
      type: "number",
      hint: "Required unless an object index is given.",
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
      path: "/conversations/mark_unread",
      params: {
        "id": input.conversationId,
        "obj_index": input.objIndex,
        "message_id": input.messageId,
      },
    });
  },
};

export default conversationMarkUnread;
