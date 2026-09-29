import type { ActionDefinition } from "@w6w/types";
import { DocuSealClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /templates/{id}` — verified against DocuSeal's OpenAPI document
 * (`getTemplate`). Returns the template's schema (documents), fields and
 * submitter roles, alongside its metadata.
 */
const templateGet: ActionDefinition = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get a Template",
  description: "Read one document template — its documents, fields and submitter roles.",
  params: [idParam("Template ID")],
  output: [
    { key: "id", type: "number", label: "Template id" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "name", type: "string", label: "Name" },
    { key: "folder_name", type: "string", label: "Folder" },
    { key: "external_id", type: "string", label: "Your own id, if set" },
    { key: "archived_at", type: "string", label: "When archived, if archived" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Last updated" },
    { key: "fields", type: "array", label: "Fields placed on the documents" },
    { key: "submitters", type: "array", label: "Submitter roles" },
    { key: "documents", type: "array", label: "The documents in the template" },
  ],

  async execute(input, ctx) {
    const id = Number((input as { id?: unknown }).id);
    if (!Number.isFinite(id)) throw new Error("`id` is required and must be a number.");

    ctx.log("info", "getting a DocuSeal template", { id });

    return await new DocuSealClient(ctx).request(`/templates/${id}`);
  },
};

export default templateGet;
