import type { ActionDefinition } from "@w6w/types";
import { DocuMergeClient } from "../lib/client.ts";

interface Input {
  documentId: number;
}

const documentFieldList: ActionDefinition<Input> = {
  key: "document-field-list",
  type: "search",
  resource: "document-field",
  title: "List Document Fields",
  description: "List the merge fields of a document.",
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
    { key: "data", type: "array", label: "Fields" },
  ],

  async execute(input, ctx) {
    return await new DocuMergeClient(ctx).json(
      `/api/documents/fields/${encodeURIComponent(String(input.documentId))}`,
      { method: "GET" },
    );
  },
};

export default documentFieldList;
