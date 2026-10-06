import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/threads/mark_read`
 *
 * Mark a thread as read up to a comment index.
 */
interface Input {
  threadId: number;
  objIndex: number;
}

const threadMarkRead: ActionDefinition<Input> = {
  key: "thread-mark-read",
  type: "perform",
  resource: "thread",
  title: "Mark Thread Read",
  description: "Mark a thread as read up to a comment index.",
  idempotent: true,
  params: [
    { key: "threadId", label: "Thread ID", type: "number", required: true },
    {
      key: "objIndex",
      label: "Object index",
      type: "number",
      required: true,
      hint: "Index of the last known read comment.",
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
      path: "/threads/mark_read",
      params: { "id": input.threadId, "obj_index": input.objIndex },
    });
  },
};

export default threadMarkRead;
