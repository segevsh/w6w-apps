import type { ActionDefinition } from "@w6w/types";
import { TelegramClient } from "../lib/client.ts";
import { chatId } from "../lib/params.ts";

const chatLeave: ActionDefinition<{ chatId: string }, boolean> = {
  key: "chat-leave",
  type: "perform",
  resource: "chat",
  title: "Leave Chat",
  description: "Remove the bot from a group, supergroup or channel.",
  idempotent: true,
  params: [chatId],
  output: [{ key: "result", type: "boolean", label: "Left" }],

  execute(input, ctx) {
    return new TelegramClient(ctx).call<boolean>("leaveChat", {
      body: { chat_id: input.chatId },
    });
  },
};

export default chatLeave;
