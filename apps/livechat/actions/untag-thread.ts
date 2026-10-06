import type { ActionDefinition } from "@w6w/types";
import { LiveChatClient, requireString } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "untag-thread",
  type: "perform",
  idempotent: true,
  resource: "thread",
  title: "Untag thread",
  description:
    "Remove a tag from a chat thread (`POST /v3.6/agent/action/untag_thread`). Tag names are " +
    "case sensitive.",
  params: [
    { key: "chatId", label: "Chat ID", type: "string", required: true },
    { key: "threadId", label: "Thread ID", type: "string", required: true },
    { key: "tag", label: "Tag", type: "string", required: true, hint: "Case sensitive." },
  ],
  output: [{ key: "untagged", type: "boolean", label: "True when LiveChat accepted the call" }],

  async execute(input, ctx) {
    await new LiveChatClient(ctx).agent("untag_thread", {
      chat_id: requireString(input.chatId, "chatId"),
      thread_id: requireString(input.threadId, "threadId"),
      tag: requireString(input.tag, "tag"),
    });
    return { untagged: true };
  },
};

export default action;
