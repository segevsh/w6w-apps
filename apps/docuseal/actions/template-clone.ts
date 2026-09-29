import type { ActionDefinition } from "@w6w/types";
import { compact, DocuSealClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `POST /templates/{id}/clone` — verified against DocuSeal's OpenAPI document
 * (`cloneTemplate`, `CloneTemplateRequest`). Creates a new, independent
 * template — a fresh id every call, so this is never idempotent.
 */
const templateClone: ActionDefinition = {
  key: "template-clone",
  type: "perform",
  resource: "template",
  title: "Clone a Template",
  description: "Create a copy of a template.",
  idempotent: false,
  params: [
    idParam("Template ID", "The template to clone."),
    {
      key: "name",
      label: "Name",
      type: "string",
      default: "",
      hint: "Existing name with a (Clone) suffix is used if not specified.",
    },
    { key: "folderName", label: "Folder Name", type: "string", default: "" },
    { key: "externalId", label: "External ID", type: "string", default: "" },
  ],
  output: [
    { key: "id", type: "number", label: "New template id" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.id);
    if (!Number.isFinite(id)) throw new Error("`id` is required and must be a number.");

    ctx.log("info", "cloning a DocuSeal template", { id });

    return await new DocuSealClient(ctx).request(`/templates/${id}/clone`, {
      method: "POST",
      body: compact({
        name: p.name,
        folder_name: p.folderName,
        external_id: p.externalId,
      }),
    });
  },
};

export default templateClone;
