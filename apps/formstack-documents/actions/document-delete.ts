import type { ActionDefinition } from "@w6w/types";
import { WebMergeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * Delete a document (DELETE /documents/{id}).
 */
const documentDelete: ActionDefinition<Input> = {
  key: "document-delete",
  type: "perform",
  resource: "document",
  title: "Delete Document",
  description: "Delete a document (DELETE /documents/{id}).",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Document ID",
      type: "string",
      required: true,
      hint: "The numeric document ID from Get a List of Documents.",
    },
  ],
  output: [
    { key: "success", type: "string", label: '"1" on success' },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request(`/documents/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default documentDelete;
