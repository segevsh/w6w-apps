import type { ActionDefinition } from "@w6w/types";
import { FigmaClient } from "../lib/client.ts";

interface Input {
  fileKey: string;
  commentId: string;
}

/**
 * DELETE /v1/files/{file_key}/comments/{comment_id} — delete a comment. Only
 * the comment's author may delete it; Figma returns 204 with no body.
 * Requires `file_comments:write`.
 */
const deleteComment: ActionDefinition<Input> = {
  key: "delete-comment",
  type: "perform",
  resource: "comment",
  title: "Delete Comment",
  description: "Delete a comment you authored.",
  idempotent: true,
  params: [
    { key: "fileKey", label: "File key", type: "string", required: true },
    { key: "commentId", label: "Comment ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const client = new FigmaClient(ctx);
    await client.request(
      `/v1/files/${encodeURIComponent(input.fileKey)}/comments/${
        encodeURIComponent(input.commentId)
      }`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default deleteComment;
