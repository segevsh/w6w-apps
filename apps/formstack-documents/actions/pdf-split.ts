import type { ActionDefinition } from "@w6w/types";
import { compact, WebMergeClient } from "../lib/client.ts";

interface Input {
  fileName: string;
  fileUrl?: string;
  fileContents?: string;
  extract?: string;
  remove?: string;
}

/**
 * Split a PDF into one file per page, or extract/remove page ranges; the result is a ZIP (POST /tools/split_pdf).
 */
const pdfSplit: ActionDefinition<Input> = {
  key: "pdf-split",
  type: "perform",
  resource: "file",
  title: "Split PDF",
  description:
    "Split a PDF into one file per page, or extract/remove page ranges; the result is a ZIP (POST /tools/split_pdf).",
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
    {
      key: "extract",
      label: "Extract pages",
      type: "string",
      hint: "Page ranges to keep, e.g. 1-3, 5, 7-8.",
    },
    {
      key: "remove",
      label: "Remove pages",
      type: "string",
      hint: "Page ranges to drop, e.g. 2, 4-7.",
    },
  ],
  output: [
    {
      key: "file",
      type: "object",
      label: "{ contentBase64, contentType, sizeBytes } \u2014 a ZIP archive",
    },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request("/tools/split_pdf", {
      method: "POST",
      body: compact({
        file: compact({ name: input.fileName, url: input.fileUrl, contents: input.fileContents }),
        extract: input.extract,
        remove: input.remove,
      }),
    });
  },
};

export default pdfSplit;
