import type { ActionDefinition } from "@w6w/types";
import { DocuMergeClient } from "../lib/client.ts";

interface Input {
  documentId: number;
}

const documentFileGet: ActionDefinition<Input> = {
  key: "document-file-get",
  type: "read",
  resource: "document",
  title: "Get Document File",
  description: "Fetch the file record (including a temporary download URL) of a document.",
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
    { key: "data", type: "object", label: "The vendor's `data` envelope" },
  ],

  async execute(input, ctx) {
    return await new DocuMergeClient(ctx).json(
      `/api/documents/files/${encodeURIComponent(String(input.documentId))}`,
      { method: "GET" },
    );
  },
};

export default documentFileGet;
