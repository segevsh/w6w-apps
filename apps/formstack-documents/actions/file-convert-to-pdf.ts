import type { ActionDefinition } from "@w6w/types";
import { compact, WebMergeClient } from "../lib/client.ts";

interface Input {
  fileName: string;
  fileUrl?: string;
  fileContents?: string;
}

/**
 * Convert a docx, xlsx, pptx, image or html file to PDF (POST /tools/convert_to_pdf).
 */
const fileConvertToPdf: ActionDefinition<Input> = {
  key: "file-convert-to-pdf",
  type: "perform",
  resource: "file",
  title: "Convert File to PDF",
  description:
    "Convert a docx, xlsx, pptx, image or html file to PDF (POST /tools/convert_to_pdf).",
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
    return new WebMergeClient(ctx).request("/tools/convert_to_pdf", {
      method: "POST",
      body: {
        file: compact({ name: input.fileName, url: input.fileUrl, contents: input.fileContents }),
      },
    });
  },
};

export default fileConvertToPdf;
