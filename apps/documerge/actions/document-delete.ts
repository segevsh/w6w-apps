import type { ActionDefinition } from "@w6w/types";
import { DocuMergeClient } from "../lib/client.ts";

interface Input {
  documentId: number;
}

const documentDelete: ActionDefinition<Input> = {
  key: "document-delete",
  type: "perform",
  resource: "document",
  title: "Delete Document",
  description: "Delete a document and its merge key.",
  idempotent: true,
  params: [
    {
      key: "documentId",
      label: "Document ID",
      type: "number",
      required: true,
      hint: "From List Documents.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when removed" },
  ],

  async execute(input, ctx) {
    return (await new DocuMergeClient(ctx).json(
      `/api/documents/${encodeURIComponent(String(input.documentId))}`,
      { method: "DELETE" },
    )) ?? { deleted: true };
  },
};

export default documentDelete;
