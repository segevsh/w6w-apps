import type { ActionDefinition } from "@w6w/types";
import { compact, DocuMergeClient } from "../lib/client.ts";

interface Input {
  name: string;
  type: string;
  output: string;
  html?: string;
  sizeWidth?: string;
  sizeHeight?: string;
  contents?: string;
  folder?: string;
  status?: string;
}

const documentCreate: ActionDefinition<Input> = {
  key: "document-create",
  type: "perform",
  resource: "document",
  title: "Create Document",
  description:
    "Create a document (merge template). Name, template type and output format are required.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "type",
      label: "Template type",
      type: "select",
      required: true,
      options: [{ value: "docx", label: "Word (docx)" }, { value: "pdf", label: "PDF" }, {
        value: "xlsx",
        label: "Excel (xlsx)",
      }, { value: "html", label: "HTML" }],
      hint: "The kind of template file the document is built from.",
    },
    {
      key: "output",
      label: "Output format",
      type: "select",
      required: true,
      options: [
        { value: "docx", label: "Word (docx)" },
        { value: "pdf", label: "PDF" },
        { value: "xlsx", label: "Excel (xlsx)" },
        { value: "html", label: "HTML" },
        { value: "email", label: "Email" },
        { value: "jpeg", label: "JPEG" },
        { value: "png", label: "PNG" },
      ],
      hint: "What a merge produces.",
    },
    { key: "html", label: "HTML", type: "text", hint: "Template HTML, for HTML-type documents." },
    { key: "sizeWidth", label: "Page width", type: "string", hint: "Page width (inches)." },
    { key: "sizeHeight", label: "Page height", type: "string", hint: "Page height (inches)." },
    {
      key: "contents",
      label: "Template contents (base64)",
      type: "text",
      hint: "Base64 contents of the template file, for docx/pdf/xlsx documents.",
    },
    { key: "folder", label: "Folder", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }, {
        value: "Test Mode",
        label: "Test Mode",
      }],
    },
  ],
  output: [
    { key: "data", type: "object", label: "The vendor's `data` envelope" },
  ],

  async execute(input, ctx) {
    return await new DocuMergeClient(ctx).json(`/api/documents`, {
      method: "POST",
      body: compact({
        name: input.name,
        type: input.type,
        output: input.output,
        html: input.html,
        size_width: input.sizeWidth,
        size_height: input.sizeHeight,
        contents: input.contents,
        folder: input.folder,
        status: input.status,
      }),
    });
  },
};

export default documentCreate;
