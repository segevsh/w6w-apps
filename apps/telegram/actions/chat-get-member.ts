import type { ActionDefinition } from "@w6w/types";
import { TelegramClient } from "../lib/client.ts";
import { chatId } from "../lib/params.ts";

interface Input {
  chatId: string;
  userId: number;
}

const chatGetMember: ActionDefinition<Input> = {
  key: "chat-get-member",
  type: "read",
  resource: "chat",
  title: "Get Chat Member",
  description:
    "Get one member's status and rights in a chat. Useful for gating a workflow on membership.",
  params: [
    chatId,
    { key: "userId", label: "User ID", type: "number", required: true },
  ],
  output: [
    { key: "status", type: "string", label: "Status (creator/administrator/member/left/kicked)" },
    { key: "user", type: "object", label: "User" },
  ],

  execute(input, ctx) {
    return new TelegramClient(ctx).call("getChatMember", {
      query: { chat_id: input.chatId, user_id: input.userId },
    });
  },
};

export default chatGetMember;
