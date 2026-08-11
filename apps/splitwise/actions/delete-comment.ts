import type { ActionDefinition } from "@w6w/types";
import { encodeId, pick, SplitwiseClient } from "../lib/client.ts";

/**
 * `POST /delete_comment/{id}` — delete a comment.
 *
 * > Deletes a comment. **Returns the deleted comment.**
 *
 * So the useful result is the comment object, not a boolean — this is the one
 * delete in the API that returns its subject rather than a `success` flag, and
 * the returned object carries the `deleted_at` stamp. The action passes it
 * through unchanged.
 *
 * Marked `idempotent: true` — deleting an already-deleted comment converges.
 */
interface Input {
  commentId: number;
}

const deleteComment: ActionDefinition<Input> = {
  key: "delete-comment",
  type: "perform",
  resource: "comment",
  title: "Delete Comment",
  description: "Delete a comment. Splitwise returns the deleted comment rather than a flag.",
  idempotent: true,
  params: [
    {
      key: "commentId",
      label: "Comment ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "The `id` of a comment from List Comments.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Comment ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "deleted_at", type: "string", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const res = await new SplitwiseClient(ctx).request(
      `/delete_comment/${encodeId(input.commentId, "commentId")}`,
      { method: "POST" },
    );
    return pick<Record<string, unknown>>(res, "comment", {});
  },
};

export default deleteComment;
