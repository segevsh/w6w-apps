import type { ActionDefinition } from "@w6w/types";
import { asJson, compact, DocuSealClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `PUT /templates/{id}/documents` — verified against DocuSeal's OpenAPI
 * document (`updateTemplateDocuments`, `UpdateTemplateDocumentsRequest`).
 * Each entry in `documents` can add a new document (`file` base64/URL, or
 * `html`), replace an existing one at a `position` (`replace: true`), or
 * remove one (`remove: true`).
 */
const templateDocumentsUpdate: ActionDefinition = {
  key: "template-documents-update",
  type: "perform",
  resource: "template",
  title: "Update Template Documents",
  description: "Add, replace or remove documents in a template.",
  idempotent: false,
  params: [
    idParam("Template ID"),
    {
      key: "documents",
      label: "Documents",
      type: "json",
      required: true,
      hint: 'A JSON array, e.g. [{"name":"Contract","file":"<base64 or URL>"}]. Each entry may ' +
        "carry `name`, `file` (base64-encoded PDF/DOCX or a downloadable URL) or `html`, " +
        "`position`, `replace` (bool) and `remove` (bool).",
    },
    {
      key: "merge",
      label: "Merge Into One PDF",
      type: "boolean",
      default: false,
      hint: "Merge all existing and new documents into a single PDF document in the template.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Template id" },
    { key: "name", type: "string", label: "Name" },
    { key: "fields", type: "array", label: "Fields, after the update" },
    { key: "documents", type: "array", label: "The documents in the template, after the update" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.id);
    if (!Number.isFinite(id)) throw new Error("`id` is required and must be a number.");
    const documents = asJson<unknown[]>(p.documents, "documents");

    ctx.log("info", "updating DocuSeal template documents", {
      id,
      documentCount: documents.length,
    });

    return await new DocuSealClient(ctx).request(`/templates/${id}/documents`, {
      method: "PUT",
      body: compact({ documents, merge: p.merge === true ? true : undefined }),
    });
  },
};

export default templateDocumentsUpdate;
