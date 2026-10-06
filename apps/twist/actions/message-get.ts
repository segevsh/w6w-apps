import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/conversation_messages/getone`
 *
 * Get a conversation message by id.
 */
interface Input {
  messageId: number;
}

const messageGet: ActionDefinition<Input> = {
  key: "message-get",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Get a conversation message by id.",
  params: [
    { key: "messageId", label: "Message ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Message ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "conversation_id", type: "number", label: "Conversation ID" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/conversation_messages/getone",
      params: { "id": input.messageId },
    });
  },
};

export default messageGet;
