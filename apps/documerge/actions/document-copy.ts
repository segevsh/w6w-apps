import type { ActionDefinition } from "@w6w/types";
import { compact, DocuMergeClient } from "../lib/client.ts";

interface Input {
  documentId: number;
  name: string;
}

const documentCopy: ActionDefinition<Input> = {
  key: "document-copy",
  type: "perform",
  resource: "document",
  title: "Copy Document",
  description: "Duplicate a document under a new name.",
  idempotent: false,
  params: [
    {
      key: "documentId",
      label: "Document ID",
      type: "number",
      required: true,
      hint: "From List Documents.",
    },
    {
      key: "name",
      label: "New name",
      type: "string",
      required: true,
      hint: "At most 255 characters.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The vendor's `data` envelope" },
  ],

  async execute(input, ctx) {
    return await new DocuMergeClient(ctx).json(
      `/api/documents/copy/${encodeURIComponent(String(input.documentId))}`,
      { method: "POST", body: compact({ name: input.name }) },
    );
  },
};

export default documentCopy;
