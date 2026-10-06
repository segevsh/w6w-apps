import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { deleteOutput } from "../lib/params.ts";

/**
 * Delete a comment (`DELETE /comments/{id}`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
}

const commentDelete: ActionDefinition<Input> = {
  key: "comment-delete",
  type: "perform",
  resource: "comment",
  title: "Delete Comment",
  description: "Delete a comment (`DELETE /comments/{id}`).",
  idempotent: true,
  params: [{ key: "id", label: "Comment ID", type: "string", required: true }],
  output: deleteOutput,

  execute(input, ctx) {
    return new ProductiveClient(ctx).remove(`/comments/${encodeId(input.id)}`, input.id);
  },
};

export default commentDelete;
