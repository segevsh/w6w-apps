import type { ActionDefinition } from "@w6w/types";
import { LiveChatClient, requireString } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "tag-thread",
  type: "perform",
  idempotent: true,
  resource: "thread",
  title: "Tag thread",
  description: "Add a tag to a chat thread (`POST /v3.6/agent/action/tag_thread`). Tag names are " +
    "case sensitive.",
  params: [
    { key: "chatId", label: "Chat ID", type: "string", required: true },
    { key: "threadId", label: "Thread ID", type: "string", required: true },
    { key: "tag", label: "Tag", type: "string", required: true, hint: "Case sensitive." },
  ],
  output: [{ key: "tagged", type: "boolean", label: "True when LiveChat accepted the call" }],

  async execute(input, ctx) {
    await new LiveChatClient(ctx).agent("tag_thread", {
      chat_id: requireString(input.chatId, "chatId"),
      thread_id: requireString(input.threadId, "threadId"),
      tag: requireString(input.tag, "tag"),
    });
    return { tagged: true };
  },
};

export default action;
