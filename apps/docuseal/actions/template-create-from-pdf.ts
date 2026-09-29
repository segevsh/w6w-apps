import type { ActionDefinition } from "@w6w/types";
import { asJson, compact, DocuSealClient } from "../lib/client.ts";

/**
 * `POST /templates/pdf` — verified against DocuSeal's OpenAPI document
 * (`createTemplateFromPdf`, `CreateTemplateFromPdfRequest`). Each entry in
 * `documents` needs `name` and `file` (base64-encoded PDF content, or a
 * downloadable file URL); fields are optional if the PDF already carries
 * `{{...}}` text tags DocuSeal parses into fields.
 *
 * Passing `externalId` for an id that already names a template updates that
 * template with the new PDF instead of creating a second one, so this is not
 * idempotent by default.
 */
const templateCreateFromPdf: ActionDefinition = {
  key: "template-create-from-pdf",
  type: "perform",
  resource: "template",
  title: "Create Template From PDF",
  description: "Build a document template from one or more PDF files.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", default: "" },
    { key: "folderName", label: "Folder Name", type: "string", default: "" },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      default: "",
      hint: "An existing template with this id is updated with the new PDF instead of creating " +
        "a second one.",
    },
    { key: "sharedLink", label: "Shared Link", type: "boolean", default: true },
    {
      key: "documents",
      label: "Documents",
      type: "json",
      required: true,
      hint: 'A JSON array of {"name": "...", "file": "<base64 or URL>", "fields": [...]}. Fields ' +
        "are optional if the PDF uses {{...}} text tags.",
    },
    {
      key: "flatten",
      label: "Flatten",
      type: "boolean",
      default: false,
      hint: "Remove PDF form fields from the documents.",
    },
    {
      key: "removeTags",
      label: "Remove {{Text}} Tags",
      type: "boolean",
      default: true,
      hint: "Disable to keep transparent {{text}} tags in the PDF for faster processing.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "New template id" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "name", type: "string", label: "Name" },
    { key: "fields", type: "array", label: "Fields parsed out of the field tags" },
    { key: "documents", type: "array", label: "The documents in the template" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const documents = asJson<unknown[]>(p.documents, "documents");

    ctx.log("info", "creating a DocuSeal template from PDF", {
      name: p.name,
      documentCount: documents.length,
    });

    return await new DocuSealClient(ctx).request("/templates/pdf", {
      method: "POST",
      body: compact({
        name: p.name,
        folder_name: p.folderName,
        external_id: p.externalId,
        shared_link: p.sharedLink === false ? false : undefined,
        documents,
        flatten: p.flatten === true ? true : undefined,
        remove_tags: p.removeTags === false ? false : undefined,
      }),
    });
  },
};

export default templateCreateFromPdf;
