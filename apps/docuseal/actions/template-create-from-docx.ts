import type { ActionDefinition } from "@w6w/types";
import { asJson, compact, DocuSealClient } from "../lib/client.ts";

/**
 * `POST /templates/docx` — verified against DocuSeal's OpenAPI document
 * (`createTemplateFromDocx`, `CreateTemplateFromDocxRequest`). Each entry in
 * `documents` needs `name` and `file` (base64-encoded DOCX content, or a
 * downloadable file URL) — the sandbox cannot attach a local file, so `file`
 * must already be base64 or a URL the caller has elsewhere.
 *
 * Passing `externalId` for an id that already names a template updates that
 * template with the new document instead of creating a second one, so this
 * is not idempotent by default.
 */
const templateCreateFromDocx: ActionDefinition = {
  key: "template-create-from-docx",
  type: "perform",
  resource: "template",
  title: "Create Template From DOCX",
  description: "Build a document template from one or more DOCX files.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", default: "" },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      default: "",
      hint: "An existing template with this id is updated with the new document instead of " +
        "creating a second one.",
    },
    { key: "folderName", label: "Folder Name", type: "string", default: "" },
    { key: "sharedLink", label: "Shared Link", type: "boolean", default: true },
    {
      key: "documents",
      label: "Documents",
      type: "json",
      required: true,
      hint: 'A JSON array of {"name": "...", "file": "<base64 or URL>"}.',
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

    ctx.log("info", "creating a DocuSeal template from DOCX", {
      name: p.name,
      documentCount: documents.length,
    });

    return await new DocuSealClient(ctx).request("/templates/docx", {
      method: "POST",
      body: compact({
        name: p.name,
        external_id: p.externalId,
        folder_name: p.folderName,
        shared_link: p.sharedLink === false ? false : undefined,
        documents,
      }),
    });
  },
};

export default templateCreateFromDocx;
