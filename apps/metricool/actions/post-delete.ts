import type { ActionDefinition } from "@w6w/types";
import { callFlag, encodeId } from "../lib/client.ts";
import { blogId, str } from "../lib/params.ts";

type Input = { blogId: string; id: string };

/** `DELETE /v2/scheduler/posts/{id}`. */
const postDelete: ActionDefinition<Input> = {
  key: "post-delete",
  type: "perform",
  resource: "post",
  title: "Delete Scheduled Post",
  description: "Delete a scheduled post. Deleting a thread's parent post deletes the whole thread.",
  idempotent: true,
  params: [blogId, str("id", "Post ID", { required: true })],
  output: [{ key: "success", type: "boolean", label: "The vendor confirmed the deletion" }],

  execute(input, ctx) {
    return callFlag(ctx, "DELETE", `/v2/scheduler/posts/${encodeId(input.id)}`, {
      blogId: input.blogId,
    });
  },
};

export default postDelete;
