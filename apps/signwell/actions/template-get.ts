import type { ActionDefinition } from "@w6w/types";
import { requireId, SignWellClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /api/v1/document_templates/{id}` — verified against SignWell's OpenAPI document
 * (`getTemplate`). Its `placeholders[]` are the roles a document created from it assigns
 * recipients to, and `fields[]` carry the `api_id`s that Create a Document from a Template
 * pre-fills. There is no list endpoint for templates.
 */
const templateGet: ActionDefinition = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get a Template",
  description: "Read one template — its placeholders (signer roles), fields and files.",
  params: [idParam("Template id")],
  output: [
    { key: "id", type: "string", label: "Template id" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "placeholders", type: "array", label: "Placeholders (signer roles)" },
    { key: "copied_placeholders", type: "array", label: "Copied placeholders" },
    { key: "fields", type: "array", label: "Fields (with their api_id)" },
    { key: "files", type: "array", label: "Files" },
    { key: "template_link", type: "string", label: "Template link" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],

  async execute(input, ctx) {
    const id = requireId((input as { id?: unknown }).id);
    ctx.log("info", "getting a SignWell template", { id });
    return await new SignWellClient(ctx).request(`/document_templates/${encodeURIComponent(id)}`);
  },
};

export default templateGet;
