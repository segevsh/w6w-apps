import type { ActionDefinition } from "@w6w/types";
import { TelegramClient } from "../lib/client.ts";
import { chatId } from "../lib/params.ts";

const chatGet: ActionDefinition<{ chatId: string }> = {
  key: "chat-get",
  type: "read",
  resource: "chat",
  title: "Get Chat",
  description: "Fetch up-to-date information about a chat: title, description, photo, permissions.",
  params: [chatId],
  output: [
    { key: "id", type: "number", label: "Chat ID" },
    { key: "type", type: "string", label: "Type (private/group/supergroup/channel)" },
    { key: "title", type: "string", label: "Title" },
    { key: "username", type: "string", label: "Username" },
    { key: "description", type: "string", label: "Description" },
  ],

  execute(input, ctx) {
    return new TelegramClient(ctx).call("getChat", { query: { chat_id: input.chatId } });
  },
};

export default chatGet;
