import type { ActionDefinition } from "@w6w/types";
import { DocuMergeClient, fileRef } from "../lib/client.ts";

interface Input {
  fileName?: string;
  fileUrl?: string;
  fileContents?: string;
}

const toolPdfConvert: ActionDefinition<Input> = {
  key: "tool-pdf-convert",
  type: "perform",
  resource: "tool",
  title: "Convert PDF",
  description: "Convert a PDF (DocuMerge's PDF convert tool).",
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
  ],
  output: [
    { key: "contentBase64", type: "string", label: "The produced file, base64-encoded" },
    { key: "contentType", type: "string", label: "MIME type DocuMerge answered" },
    { key: "size", type: "number", label: "Size in bytes" },
  ],

  async execute(input, ctx) {
    const file = fileRef(input);
    return await new DocuMergeClient(ctx).file(`/api/tools/pdf/convert`, { file });
  },
};

export default toolPdfConvert;
