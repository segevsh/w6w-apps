import type { ActionDefinition } from "@w6w/types";
import { TelegramClient } from "../lib/client.ts";
import { chatId } from "../lib/params.ts";

const chatGetAdministrators: ActionDefinition<{ chatId: string }, unknown[]> = {
  key: "chat-get-administrators",
  type: "read",
  resource: "chat",
  title: "Get Chat Administrators",
  description:
    "List the administrators of a chat. Returns every admin except other bots; in a channel with anonymous admins only the creator is returned.",
  params: [chatId],
  output: [{ key: "result", type: "array", label: "Chat members" }],

  execute(input, ctx) {
    return new TelegramClient(ctx).call<unknown[]>("getChatAdministrators", {
      query: { chat_id: input.chatId },
    });
  },
};

export default chatGetAdministrators;
