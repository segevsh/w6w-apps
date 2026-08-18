import type { ActionDefinition } from "@w6w/types";
import { ConfluenceClient } from "../lib/client.ts";

/**
 * `DELETE /wiki/api/v2/footer-comments/{comment-id}` — verified against
 * Confluence Cloud's REST API v2 OpenAPI document (`deleteFooterComment`).
 * Confluence answers 204 with no body.
 */
const action: ActionDefinition = {
  key: "comment-delete",
  type: "perform",
  resource: "comment",
  title: "Delete a comment",
  description: "Remove a footer comment.",
  idempotent: true,
  params: [
    { key: "commentId", label: "Comment ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const commentId = String(p.commentId ?? "").trim();
    if (!commentId) throw new Error("`commentId` is required");

    const client = new ConfluenceClient(ctx);
    ctx.log("info", "deleting Confluence comment", { commentId });

    await client.request(`/footer-comments/${encodeURIComponent(commentId)}`, {
      method: "DELETE",
    });
    return { id: commentId, deleted: true };
  },
};

export default action;
