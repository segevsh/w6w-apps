import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, seg } from "../lib/client.ts";

interface Input {
  commentId: string;
}

/**
 * Delete a comment — `DELETE /{ig-comment-id}`. Per the reference, a comment can
 * only be deleted by the owner of the media it was made on. Not supported on
 * live-video media. Idempotent in effect: deleting a missing comment errors, but
 * leaves the same end state.
 */
const deleteComment: ActionDefinition<Input, { success: boolean }> = {
  key: "delete-comment",
  type: "perform",
  resource: "comment",
  title: "Delete Comment",
  description: "Delete a comment from one of the account's posts.",
  idempotent: true,
  params: [{ key: "commentId", label: "Comment ID", type: "string", required: true }],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<{ success: boolean }>(`/${seg(input.commentId)}`, {
      method: "DELETE",
    });
  },
};

export default deleteComment;
