import type { ActionDefinition } from "@w6w/types";
import { asJson, asJsonOptional, compact, DocuSealClient } from "../lib/client.ts";

/**
 * `POST /templates/merge` — verified against DocuSeal's OpenAPI document
 * (`mergeTemplate`, `MergeTemplateRequest`). Combines several existing
 * templates' documents into one new template — a fresh id every call, so
 * this is never idempotent.
 */
const templateMerge: ActionDefinition = {
  key: "template-merge",
  type: "perform",
  resource: "template",
  title: "Merge Templates",
  description: "Merge two or more templates' documents into a new template.",
  idempotent: false,
  params: [
    {
      key: "templateIds",
      label: "Template IDs",
      type: "json",
      required: true,
      hint: "A JSON array of template ids to merge, e.g. [321, 432].",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      default: "",
      hint: "Existing name with a (Merged) suffix is used if not specified.",
    },
    { key: "folderName", label: "Folder Name", type: "string", default: "" },
    { key: "externalId", label: "External ID", type: "string", default: "" },
    { key: "sharedLink", label: "Shared Link", type: "boolean", default: true },
    {
      key: "roles",
      label: "Submitter Roles",
      type: "json",
      default: "",
      hint: 'A JSON array of role names to use in the merged template, e.g. ["Agent","Customer"].',
    },
  ],
  output: [
    { key: "id", type: "number", label: "New template id" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const templateIds = asJson<number[]>(p.templateIds, "templateIds");

    ctx.log("info", "merging DocuSeal templates", { count: templateIds.length });

    return await new DocuSealClient(ctx).request("/templates/merge", {
      method: "POST",
      body: compact({
        template_ids: templateIds,
        name: p.name,
        folder_name: p.folderName,
        external_id: p.externalId,
        shared_link: p.sharedLink === false ? false : undefined,
        roles: asJsonOptional<string[]>(p.roles, "roles"),
      }),
    });
  },
};

export default templateMerge;
