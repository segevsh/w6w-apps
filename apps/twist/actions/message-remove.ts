import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/conversation_messages/remove`
 *
 * Delete a message you sent.
 */
interface Input {
  messageId: number;
}

const messageRemove: ActionDefinition<Input> = {
  key: "message-remove",
  type: "perform",
  resource: "message",
  title: "Remove Message",
  description: "Delete a message you sent.",
  idempotent: true,
  params: [
    { key: "messageId", label: "Message ID", type: "number", required: true },
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
      path: "/conversation_messages/remove",
      params: { "id": input.messageId },
    });
  },
};

export default messageRemove;
