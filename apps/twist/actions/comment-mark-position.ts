import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/comments/mark_position`
 *
 * Mark the user's reading position in a thread.
 */
interface Input {
  threadId: number;
  commentId: number;
}

const commentMarkPosition: ActionDefinition<Input> = {
  key: "comment-mark-position",
  type: "perform",
  resource: "comment",
  title: "Mark Comment Position",
  description: "Mark the user's reading position in a thread.",
  idempotent: true,
  params: [
    { key: "threadId", label: "Thread ID", type: "number", required: true },
    { key: "commentId", label: "Comment ID", type: "number", required: true },
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
      path: "/comments/mark_position",
      params: { "thread_id": input.threadId, "comment_id": input.commentId },
    });
  },
};

export default commentMarkPosition;
