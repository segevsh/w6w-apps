import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/threads/mark_unread`
 *
 * Mark a thread as unread.
 */
interface Input {
  threadId: number;
  objIndex: number;
}

const threadMarkUnread: ActionDefinition<Input> = {
  key: "thread-mark-unread",
  type: "perform",
  resource: "thread",
  title: "Mark Thread Unread",
  description: "Mark a thread as unread.",
  idempotent: true,
  params: [
    { key: "threadId", label: "Thread ID", type: "number", required: true },
    {
      key: "objIndex",
      label: "Object index",
      type: "number",
      required: true,
      hint: "Index of the last unread comment; -1 marks the whole thread unread.",
    },
  ],
  output: [
    {
      key: "result",
      type: "string",
      label: "Twist's response when it is not an object (normally empty)",
    },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/threads/mark_unread",
      params: { "id": input.threadId, "obj_index": input.objIndex },
    });
  },
};

export default threadMarkUnread;
