import type { ActionDefinition } from "@w6w/types";
import { compact, WebMergeClient } from "../lib/client.ts";

interface Input {
  name: string;
  type: string;
  output: string;
  outputName?: string;
  folder?: string;
  html?: string;
  sizeWidth?: number;
  sizeHeight?: number;
  fileUrl?: string;
  fileContents?: string;
  notification?: Record<string, unknown>;
}

/**
 * Create a new document (template) of type html, pdf, docx, xlsx or pptx (POST /documents).
 */
const documentCreate: ActionDefinition<Input> = {
  key: "document-create",
  type: "perform",
  resource: "document",
  title: "Create Document",
  description:
    "Create a new document (template) of type html, pdf, docx, xlsx or pptx (POST /documents).",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: ["html", "pdf", "docx", "xlsx", "pptx"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "output",
      label: "Output",
      type: "select",
      required: true,
      hint: "What a merge produces.",
      options: ["pdf", "docx", "xlsx", "pptx", "email"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "outputName",
      label: "Output file name",
      type: "string",
      hint: 'Customized filename, may use merge fields, e.g. "Invoice {$FirstName}".',
    },
    { key: "folder", label: "Folder", type: "string", hint: "Created if it does not exist." },
    { key: "html", label: "HTML", type: "text", hint: "Required when type is html." },
    {
      key: "sizeWidth",
      label: "Page width (in)",
      type: "number",
      hint: "HTML documents only.",
      advanced: true,
    },
    {
      key: "sizeHeight",
      label: "Page height (in)",
      type: "number",
      hint: "HTML documents only.",
      advanced: true,
    },
    {
      key: "fileUrl",
      label: "File URL",
      type: "string",
      hint: "Public URL of the file, for pdf/docx/xlsx/pptx. Use this or File contents.",
    },
    {
      key: "fileContents",
      label: "File contents (base64)",
      type: "text",
      hint: "Base64 file contents, as an alternative to File URL.",
    },
    {
      key: "notification",
      label: "Default email notification",
      type: "json",
      hint: "Object with to, from, subject, html, security (low|medium|high) and password.",
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Document ID" },
    { key: "key", type: "string", label: "Merge key" },
    { key: "url", type: "string", label: "Merge URL" },
    { key: "fields", type: "array", label: "Detected merge fields" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request("/documents", {
      method: "POST",
      body: compact({
        name: input.name,
        type: input.type,
        output: input.output,
        output_name: input.outputName,
        folder: input.folder,
        html: input.html,
        size_width: input.sizeWidth,
        size_height: input.sizeHeight,
        file_url: input.fileUrl,
        file_contents: input.fileContents,
        notification: input.notification,
      }),
    });
  },
};

export default documentCreate;
