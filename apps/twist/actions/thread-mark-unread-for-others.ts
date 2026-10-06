import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/threads/mark_unread_for_others`
 *
 * Mark a thread as unread for everyone else, to draw attention to a change.
 */
interface Input {
  threadId: number;
  objIndex: number;
}

const threadMarkUnreadForOthers: ActionDefinition<Input> = {
  key: "thread-mark-unread-for-others",
  type: "perform",
  resource: "thread",
  title: "Mark Thread Unread for Others",
  description: "Mark a thread as unread for everyone else, to draw attention to a change.",
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
      path: "/threads/mark_unread_for_others",
      params: { "id": input.threadId, "obj_index": input.objIndex },
    });
  },
};

export default threadMarkUnreadForOthers;
