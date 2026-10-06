import type { ActionDefinition } from "@w6w/types";
import { compact, DocuMergeClient, fileRef } from "../lib/client.ts";

interface Input {
  fileName?: string;
  fileUrl?: string;
  fileContents?: string;
  extract?: string;
  remove?: string;
}

const toolPdfSplit: ActionDefinition<Input> = {
  key: "tool-pdf-split",
  type: "perform",
  resource: "tool",
  title: "Split PDF",
  description: "Extract, or remove, page ranges of a PDF.",
  idempotent: true,
  params: [
    {
      key: "fileName",
      label: "File name",
      type: "string",
      hint: "Name of the file, e.g. report.pdf.",
    },
    {
      key: "fileUrl",
      label: "File URL",
      type: "string",
      hint: "A publicly reachable URL DocuMerge can download. Use this or File contents.",
    },
    {
      key: "fileContents",
      label: "File contents (base64)",
      type: "text",
      hint: "Base64-encoded file bytes, as an alternative to a URL.",
    },
    {
      key: "extract",
      label: "Pages to extract",
      type: "string",
      hint: "Page ranges to keep, e.g. 1-3,5.",
    },
    {
      key: "remove",
      label: "Pages to remove",
      type: "string",
      hint: "Page ranges to drop, e.g. 2,4-6.",
    },
  ],
  output: [
    { key: "contentBase64", type: "string", label: "The produced file, base64-encoded" },
    { key: "contentType", type: "string", label: "MIME type DocuMerge answered" },
    { key: "size", type: "number", label: "Size in bytes" },
  ],

  async execute(input, ctx) {
    const file = fileRef(input);
    return await new DocuMergeClient(ctx).file(
      `/api/tools/pdf/split`,
      compact({
        file,
        extract: input.extract?.trim() ? [input.extract.trim()] : undefined,
        remove: input.remove?.trim() ? [input.remove.trim()] : undefined,
      }),
    );
  },
};

export default toolPdfSplit;
