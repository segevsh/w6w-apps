import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/comments/remove`
 *
 * Delete a comment. Only its author or an admin may.
 */
interface Input {
  commentId: number;
}

const commentRemove: ActionDefinition<Input> = {
  key: "comment-remove",
  type: "perform",
  resource: "comment",
  title: "Remove Comment",
  description: "Delete a comment. Only its author or an admin may.",
  idempotent: true,
  params: [
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
      path: "/comments/remove",
      params: { "id": input.commentId },
    });
  },
};

export default commentRemove;
