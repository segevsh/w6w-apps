import type { ActionDefinition } from "@w6w/types";
import { TelegramClient } from "../lib/client.ts";
import { chatId } from "../lib/params.ts";

interface Input {
  chatId: string;
  messageId: number;
}

const messageDelete: ActionDefinition<Input, boolean> = {
  key: "message-delete",
  type: "perform",
  resource: "message",
  title: "Delete Message",
  description:
    "Delete a message. Bots can delete their own messages, and any message in a group where they are an administrator.",
  // Deleting an already-deleted message errors upstream, but the end state is
  // the same either way — safe to retry.
  idempotent: true,
  params: [
    chatId,
    { key: "messageId", label: "Message ID", type: "number", required: true },
  ],
  output: [{ key: "result", type: "boolean", label: "Deleted" }],

  execute(input, ctx) {
    return new TelegramClient(ctx).call<boolean>("deleteMessage", {
      body: { chat_id: input.chatId, message_id: input.messageId },
    });
  },
};

export default messageDelete;
