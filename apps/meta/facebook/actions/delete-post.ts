import type { ActionDefinition } from "@w6w/types";
import { FacebookClient } from "../lib/client.ts";

interface Input {
  postId: string;
}

/**
 * Delete a post — `DELETE /{post-id}`.
 *
 * Not `idempotent`: unlike some vendors, Facebook does not document deleting
 * an already-deleted (or already-gone) object as a no-op success — a retried
 * delete against a vanished id returns an error, so a caller cannot safely
 * treat this as safe-to-retry.
 */
const deletePost: ActionDefinition<Input, { deleted: true }> = {
  key: "delete-post",
  type: "perform",
  resource: "post",
  title: "Delete Post",
  description: "Delete a post by id.",
  idempotent: false,
  params: [
    { key: "postId", label: "Post ID", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new FacebookClient(ctx);
    await client.request(`/${input.postId}`, { method: "DELETE" });
    return { deleted: true };
  },
};

export default deletePost;
