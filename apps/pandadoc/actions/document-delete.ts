import type { ActionDefinition } from "@w6w/types";
import { PandaDocClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
}

/**
 * `DELETE /public/v1/documents/{id}` — move a document to the recycle bin.
 *
 * Success is `204 No Content`, so this action echoes the id it deleted rather
 * than inventing a response body. `423` means the document is locked because
 * someone has it open in the editor.
 *
 * The deletion is soft: `document-get-many` with `deleted: true` lists deleted
 * documents, which is the observable that makes this safe to retry.
 */
const documentDelete: ActionDefinition<Input> = {
  key: "document-delete",
  type: "perform",
  resource: "document",
  title: "Delete Document",
  description: "Delete a document. Soft delete — list it again with the `Deleted only` filter.",
  // Deleting an already-deleted document adds no further effect (it answers
  // 404), so a retry is safe.
  idempotent: true,
  params: [documentIdParam],
  output: [
    { key: "documentId", type: "string", label: "Deleted document ID" },
    { key: "deleted", type: "boolean", label: "Always true on success" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting PandaDoc document", { documentId: input.documentId });
    await new PandaDocClient(ctx).request(
      `/documents/${encodeURIComponent(input.documentId)}`,
      { method: "DELETE" },
    );
    return { documentId: input.documentId, deleted: true };
  },
};

export default documentDelete;
