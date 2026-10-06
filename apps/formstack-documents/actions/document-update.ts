import type { ActionDefinition } from "@w6w/types";
import { compact, WebMergeClient } from "../lib/client.ts";

interface Input {
  id: string;
  name?: string;
  output?: string;
  outputName?: string;
  folder?: string;
  html?: string;
  sizeWidth?: number;
  sizeHeight?: number;
  fileUrl?: string;
  fileContents?: string;
}

/**
 * Update a document. Only the fields you send change; the type cannot be changed (PUT /documents/{id}).
 */
const documentUpdate: ActionDefinition<Input> = {
  key: "document-update",
  type: "perform",
  resource: "document",
  title: "Update Document",
  description:
    "Update a document. Only the fields you send change; the type cannot be changed (PUT /documents/{id}).",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Document ID",
      type: "string",
      required: true,
      hint: "The numeric document ID from Get a List of Documents.",
    },
    { key: "name", label: "Name", type: "string" },
    {
      key: "output",
      label: "Output",
      type: "select",
      options: ["pdf", "docx", "xlsx", "pptx", "email"].map((v) => ({ value: v, label: v })),
    },
    { key: "outputName", label: "Output file name", type: "string" },
    { key: "folder", label: "Folder", type: "string" },
    { key: "html", label: "HTML", type: "text" },
    { key: "sizeWidth", label: "Page width (in)", type: "number", advanced: true },
    { key: "sizeHeight", label: "Page height (in)", type: "number", advanced: true },
    { key: "fileUrl", label: "File URL", type: "string" },
    { key: "fileContents", label: "File contents (base64)", type: "text" },
  ],
  output: [
    { key: "id", type: "string", label: "Document ID" },
    { key: "key", type: "string", label: "Merge key" },
    { key: "fields", type: "array", label: "Detected merge fields" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request(`/documents/${encodeURIComponent(input.id)}`, {
      method: "PUT",
      body: compact({
        name: input.name,
        output: input.output,
        output_name: input.outputName,
        folder: input.folder,
        html: input.html,
        size_width: input.sizeWidth,
        size_height: input.sizeHeight,
        file_url: input.fileUrl,
        file_contents: input.fileContents,
      }),
    });
  },
};

export default documentUpdate;
