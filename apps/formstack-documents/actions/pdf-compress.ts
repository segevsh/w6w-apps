import type { ActionDefinition } from "@w6w/types";
import { compact, WebMergeClient } from "../lib/client.ts";

interface Input {
  fileName: string;
  fileUrl?: string;
  fileContents?: string;
}

/**
 * Compress a PDF file (POST /tools/compress_pdf).
 */
const pdfCompress: ActionDefinition<Input> = {
  key: "pdf-compress",
  type: "perform",
  resource: "file",
  title: "Compress PDF",
  description: "Compress a PDF file (POST /tools/compress_pdf).",
  idempotent: true,
  params: [
    {
      key: "fileName",
      label: "File name",
      type: "string",
      required: true,
      hint: "e.g. contract.pdf",
    },
    {
      key: "fileUrl",
      label: "File URL",
      type: "string",
      hint: "Public URL of the file. Use this or File contents.",
    },
    {
      key: "fileContents",
      label: "File contents (base64)",
      type: "text",
      hint: "Base64 file data, as an alternative to File URL.",
    },
  ],
  output: [
    { key: "file", type: "object", label: "{ contentBase64, contentType, sizeBytes }" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request("/tools/compress_pdf", {
      method: "POST",
      body: {
        file: compact({ name: input.fileName, url: input.fileUrl, contents: input.fileContents }),
      },
    });
  },
};

export default pdfCompress;
