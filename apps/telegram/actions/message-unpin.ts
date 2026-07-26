import type { ActionDefinition } from "@w6w/types";
import { TelegramClient } from "../lib/client.ts";
import { chatId } from "../lib/params.ts";

interface Input {
  chatId: string;
  messageId?: number;
}

const messageUnpin: ActionDefinition<Input, boolean> = {
  key: "message-unpin",
  type: "perform",
  resource: "message",
  title: "Unpin Message",
  description: "Unpin a message. Omit the message ID to unpin the most recently pinned message.",
  idempotent: true,
  params: [
    chatId,
    {
      key: "messageId",
      label: "Message ID",
      type: "number",
      hint: "Leave empty to unpin the most recent pin.",
    },
  ],
  output: [{ key: "result", type: "boolean", label: "Unpinned" }],

  execute(input, ctx) {
    return new TelegramClient(ctx).call<boolean>("unpinChatMessage", {
      body: { chat_id: input.chatId, message_id: input.messageId },
    });
  },
};

export default messageUnpin;
