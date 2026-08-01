import type { ActionDefinition } from "@w6w/types";
import { encodeUrn, LinkedInClient } from "../lib/client.ts";

interface Input {
  postUrn: string;
}

/**
 * `DELETE /rest/posts/{encoded postUrn}`. LinkedIn documents deletion as
 * idempotent explicitly — a delete replayed against an already-deleted post
 * still returns `204`:
 * https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api#delete-posts
 */
const deletePost: ActionDefinition<Input, { deleted: true }> = {
  key: "delete-post",
  type: "perform",
  resource: "post",
  title: "Delete Post",
  description: "Delete a post by its URN. Safe to retry — LinkedIn's own delete is idempotent.",
  idempotent: true,
  params: [
    { key: "postUrn", label: "Post URN", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new LinkedInClient(ctx);
    await client.request(`/rest/posts/${encodeUrn(input.postUrn)}`, {
      method: "DELETE",
      restliMethod: "DELETE",
    });
    return { deleted: true };
  },
};

export default deletePost;
