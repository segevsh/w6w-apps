import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/comments/add` with `thread_action: close`
 *
 * Close a thread by posting a comment with `thread_action: close`. Twist has no separate close endpoint.
 *
 * Not idempotent: a retry repeats the side effect.
 */
interface Input {
  threadId: number;
  content: string;
}

const threadClose: ActionDefinition<Input> = {
  key: "thread-close",
  type: "perform",
  resource: "thread",
  title: "Close Thread",
  description:
    "Close a thread by posting a comment with `thread_action: close`. Twist has no separate close endpoint.",
  idempotent: false,
  params: [
    { key: "threadId", label: "Thread ID", type: "number", required: true },
    {
      key: "content",
      label: "Content",
      type: "text",
      required: true,
      hint:
        "Mentions: [Name](twist-mention://user_id) for a user, [Group](twist-group-mention://group_id) for a group. Max 15,000 characters.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Comment ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "thread_id", type: "number", label: "Thread ID" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/comments/add",
      params: { "thread_id": input.threadId, "content": input.content, "thread_action": "close" },
    });
  },
};

export default threadClose;
