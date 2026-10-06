import type { ActionDefinition } from "@w6w/types";
import { requireId, SignWellClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `DELETE /api/v1/documents/{id}` — verified against SignWell's OpenAPI document
 * (`deleteDocument`): 204 no content, 404 `record_not_found` if it is gone.
 */
const documentDelete: ActionDefinition = {
  key: "document-delete",
  type: "perform",
  resource: "document",
  title: "Delete a Document",
  description: "Delete a document. Recipients can no longer open it.",
  idempotent: true,
  params: [idParam("Document id")],
  output: [
    { key: "id", type: "string", label: "Document id" },
    { key: "deleted", type: "boolean", label: "True once SignWell answered 204" },
  ],

  async execute(input, ctx) {
    const id = requireId((input as { id?: unknown }).id);
    ctx.log("info", "deleting a SignWell document", { id });
    await new SignWellClient(ctx).request(`/documents/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return { id, deleted: true };
  },
};

export default documentDelete;
