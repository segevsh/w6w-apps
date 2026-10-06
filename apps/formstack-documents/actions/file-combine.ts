import type { ActionDefinition } from "@w6w/types";
import { WebMergeClient } from "../lib/client.ts";

interface Input {
  output: string;
  files: Array<Record<string, unknown>>;
}

/**
 * Combine several files (pdf, docx, xlsx, pptx, images, html) into one PDF or DOCX (POST /tools/combine).
 */
const fileCombine: ActionDefinition<Input> = {
  key: "file-combine",
  type: "perform",
  resource: "file",
  title: "Combine Files",
  description:
    "Combine several files (pdf, docx, xlsx, pptx, images, html) into one PDF or DOCX (POST /tools/combine).",
  idempotent: true,
  params: [
    {
      key: "output",
      label: "Output",
      type: "select",
      required: true,
      options: ["pdf", "docx"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "files",
      label: "Files",
      type: "json",
      required: true,
      hint: "Array of { name, url } or { name, contents } where contents is base64.",
    },
  ],
  output: [
    { key: "file", type: "object", label: "{ contentBase64, contentType, sizeBytes }" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request("/tools/combine", {
      method: "POST",
      body: { output: input.output, files: input.files },
    });
  },
};

export default fileCombine;
