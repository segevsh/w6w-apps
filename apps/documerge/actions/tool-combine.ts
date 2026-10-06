import type { ActionDefinition } from "@w6w/types";
import { asArray, DocuMergeClient } from "../lib/client.ts";

interface Input {
  output: string;
  files: unknown;
}

const toolCombine: ActionDefinition<Input> = {
  key: "tool-combine",
  type: "perform",
  resource: "tool",
  title: "Combine Files",
  description: "Combine several files into one PDF or Word file.",
  idempotent: true,
  params: [
    {
      key: "output",
      label: "Output format",
      type: "select",
      required: true,
      default: "pdf",
      options: [{ value: "pdf", label: "PDF" }, { value: "docx", label: "Word (docx)" }],
    },
    {
      key: "files",
      label: "Files",
      type: "json",
      required: true,
      hint: "JSON array of `{name, url}` or `{name, contents}` (base64) objects, in merge order.",
    },
  ],
  output: [
    { key: "contentBase64", type: "string", label: "The produced file, base64-encoded" },
    { key: "contentType", type: "string", label: "MIME type DocuMerge answered" },
    { key: "size", type: "number", label: "Size in bytes" },
  ],

  async execute(input, ctx) {
    return await new DocuMergeClient(ctx).file(`/api/tools/combine`, {
      output: input.output,
      files: asArray(input.files, "Files"),
    });
  },
};

export default toolCombine;
