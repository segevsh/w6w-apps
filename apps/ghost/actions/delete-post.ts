import type { ActionDefinition } from "@w6w/types";
import { GhostClient } from "../lib/client.ts";

interface Input {
  postId: string;
}

const deletePost: ActionDefinition<Input> = {
  key: "delete-post",
  type: "perform",
  resource: "post",
  title: "Delete Post",
  description: "Permanently delete a post. Ghost has no trash — this cannot be undone.",
  idempotent: true,
  params: [
    { key: "postId", label: "Post ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Post ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const client = GhostClient.fromConnection(ctx);
    await client.destroy("posts", input.postId);
    return { id: input.postId, deleted: true };
  },
};

export default deletePost;
