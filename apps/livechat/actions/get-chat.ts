import type { ActionDefinition } from "@w6w/types";
import { compact, LiveChatClient, optString, requireString } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "get-chat",
  type: "read",
  resource: "chat",
  title: "Get chat",
  description:
    "One chat with a thread and its events (`POST /v3.6/agent/action/get_chat`). Without a " +
    "thread id LiveChat returns the latest thread.",
  params: [
    { key: "chatId", label: "Chat ID", type: "string", required: true },
    { key: "threadId", label: "Thread ID", type: "string", hint: "Default: the latest thread." },
  ],
  output: [{
    key: "chat",
    type: "object",
    label: "The chat: id, users, thread, properties, access",
  }],

  async execute(input, ctx) {
    const chat = await new LiveChatClient(ctx).agent(
      "get_chat",
      compact({
        chat_id: requireString(input.chatId, "chatId"),
        thread_id: optString(input.threadId),
      }),
    );
    return { chat };
  },
};

export default action;
