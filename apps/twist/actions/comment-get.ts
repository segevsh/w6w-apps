import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/comments/getone`
 *
 * Get a comment by id.
 */
interface Input {
  commentId: number;
}

const commentGet: ActionDefinition<Input> = {
  key: "comment-get",
  type: "read",
  resource: "comment",
  title: "Get Comment",
  description: "Get a comment by id.",
  params: [
    { key: "commentId", label: "Comment ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Comment ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "thread_id", type: "number", label: "Thread ID" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/comments/getone",
      params: { "id": input.commentId },
    });
  },
};

export default commentGet;
