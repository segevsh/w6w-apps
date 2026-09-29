import type { ActionDefinition } from "@w6w/types";
import { asJsonOptional, compact, DocuSealClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `PUT /templates/{id}` — verified against DocuSeal's OpenAPI document
 * (`updateTemplate`, `UpdateTemplateRequest`). Renames a template, moves it
 * to a folder, replaces its submitter role names, or unarchives it —
 * `archived: false` is the documented way back from `template-archive`.
 */
const templateUpdate: ActionDefinition = {
  key: "template-update",
  type: "perform",
  resource: "template",
  title: "Update a Template",
  description: "Rename a template, move it to a folder, replace its roles, or unarchive it.",
  idempotent: true,
  params: [
    idParam("Template ID"),
    { key: "name", label: "Name", type: "string", default: "" },
    { key: "folderName", label: "Folder Name", type: "string", default: "" },
    {
      key: "roles",
      label: "Submitter Roles",
      type: "json",
      default: "",
      hint: 'A JSON array of role names to update the template with, e.g. ["Agent","Customer"].',
    },
    {
      key: "archived",
      label: "Archived",
      type: "boolean",
      default: "",
      hint: "Set false to unarchive the template. Leave unset to not change it.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Template id" },
    { key: "updated_at", type: "string", label: "Last updated" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.id);
    if (!Number.isFinite(id)) throw new Error("`id` is required and must be a number.");

    ctx.log("info", "updating a DocuSeal template", { id });

    return await new DocuSealClient(ctx).request(`/templates/${id}`, {
      method: "PUT",
      body: compact({
        name: p.name,
        folder_name: p.folderName,
        roles: asJsonOptional<string[]>(p.roles, "roles"),
        archived: typeof p.archived === "boolean" ? p.archived : undefined,
      }),
    });
  },
};

export default templateUpdate;
