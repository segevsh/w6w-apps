import type { ActionDefinition } from "@w6w/types";
import { WhatsAppClient } from "../lib/client.ts";

interface Input {
  messageId: string;
}

const messageMarkRead: ActionDefinition<Input> = {
  key: "message-mark-read",
  type: "perform",
  resource: "message",
  title: "Mark Message as Read",
  description: "Mark an inbound message as read (issues the blue double-check to the sender). " +
    "Must be called within 30 days of the message being received.",
  // Marking an already-read message read again is a no-op on Meta's side.
  idempotent: true,
  params: [
    {
      key: "messageId",
      label: "Message ID",
      type: "string",
      required: true,
      hint: "The `wamid...` id from the inbound message webhook.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new WhatsAppClient(ctx).markRead(input.messageId);
  },
};

export default messageMarkRead;
