import type { ActionDefinition } from "@w6w/types";
import { TelegramClient } from "../lib/client.ts";
import { chatId } from "../lib/params.ts";

interface Input {
  chatId: string;
  messageId: number;
  disableNotification?: boolean;
}

const messagePin: ActionDefinition<Input, boolean> = {
  key: "message-pin",
  type: "perform",
  resource: "message",
  title: "Pin Message",
  description: "Pin a message in a chat. Requires the `can_pin_messages` admin right.",
  idempotent: true,
  params: [
    chatId,
    { key: "messageId", label: "Message ID", type: "number", required: true },
    {
      key: "disableNotification",
      label: "Silent",
      type: "boolean",
      hint: "Pin without notifying chat members.",
    },
  ],
  output: [{ key: "result", type: "boolean", label: "Pinned" }],

  execute(input, ctx) {
    return new TelegramClient(ctx).call<boolean>("pinChatMessage", {
      body: {
        chat_id: input.chatId,
        message_id: input.messageId,
        disable_notification: input.disableNotification,
      },
    });
  },
};

export default messagePin;
