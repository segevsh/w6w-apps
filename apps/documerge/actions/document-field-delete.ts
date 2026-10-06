import type { ActionDefinition } from "@w6w/types";
import { DocuMergeClient } from "../lib/client.ts";

interface Input {
  documentId: number;
  fieldId: number;
}

const documentFieldDelete: ActionDefinition<Input> = {
  key: "document-field-delete",
  type: "perform",
  resource: "document-field",
  title: "Delete Document Field",
  description: "Remove a merge field from a document.",
  idempotent: true,
  params: [
    {
      key: "documentId",
      label: "Document ID",
      type: "number",
      required: true,
      hint: "From List Documents.",
    },
    {
      key: "fieldId",
      label: "Field ID",
      type: "number",
      required: true,
      hint: "From List Document Fields.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when removed" },
  ],

  async execute(input, ctx) {
    return (await new DocuMergeClient(ctx).json(
      `/api/documents/fields/${encodeURIComponent(String(input.documentId))}/${
        encodeURIComponent(String(input.fieldId))
      }`,
      { method: "DELETE" },
    )) ?? { deleted: true };
  },
};

export default documentFieldDelete;
