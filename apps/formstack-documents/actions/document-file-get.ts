import type { ActionDefinition } from "@w6w/types";
import { WebMergeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * Get the file uploaded for a pdf/docx/xlsx/pptx document as base64 (GET /documents/{id}/file).
 */
const documentFileGet: ActionDefinition<Input> = {
  key: "document-file-get",
  type: "read",
  resource: "document",
  title: "Get Document File",
  description:
    "Get the file uploaded for a pdf/docx/xlsx/pptx document as base64 (GET /documents/{id}/file).",
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
    { key: "type", type: "string", label: "File type" },
    { key: "last_update", type: "string", label: "Last update" },
    { key: "contents", type: "string", label: "Base64 file data" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request(`/documents/${encodeURIComponent(input.id)}/file`);
  },
};

export default documentFileGet;
