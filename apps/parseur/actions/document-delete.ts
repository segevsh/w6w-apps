import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

/**
 * `DELETE /document/{id}` — permanently delete a document.
 *
 * The OpenAPI document declares this operation with no response schema of any
 * kind, so only the HTTP status is reported.
 */
interface Input {
  documentId: string;
}

const documentDelete: ActionDefinition<Input> = {
  key: "document-delete",
  type: "perform",
  resource: "document",
  title: "Delete Document",
  description: "Permanently delete a document by id.",
  idempotent: true,
  params: [documentIdParam],
  output: [
    { key: "documentId", type: "string", label: "Document deleted" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new ParseurClient(ctx).status(`/document/${encodeId(input.documentId)}`, {
      method: "DELETE",
    });
    return { documentId: input.documentId, status };
  },
};

export default documentDelete;
