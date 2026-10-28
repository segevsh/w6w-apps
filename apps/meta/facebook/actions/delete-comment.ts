import type { ActionDefinition } from "@w6w/types";
import { FacebookClient } from "../lib/client.ts";

interface Input {
  commentId: string;
}

/**
 * Delete a comment — `DELETE /{comment-id}`.
 *
 * Not `idempotent`, for the same reason as `delete-post`: Facebook does not
 * document a repeated delete against an already-gone comment as a no-op.
 */
const deleteComment: ActionDefinition<Input, { deleted: true }> = {
  key: "delete-comment",
  type: "perform",
  resource: "comment",
  title: "Delete Comment",
  description: "Delete a comment by id.",
  idempotent: false,
  params: [
    { key: "commentId", label: "Comment ID", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new FacebookClient(ctx);
    await client.request(`/${input.commentId}`, { method: "DELETE" });
    return { deleted: true };
  },
};

export default deleteComment;
