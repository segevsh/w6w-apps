import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient, fieldsToPatch, json, query } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /{org}/{project}/_apis/wit/workitems/${type}` — create a work item.
 *
 * ## This is the only part of the API that takes a JSON Patch document
 *
 * Not an object. A list of operations:
 *
 * ```json
 * [{"op": "add", "path": "/fields/System.Title", "value": "Fix login"}]
 * ```
 *
 * sent as **`application/json-patch+json`**. Posting a plain object fails, and
 * the error mentions neither the patch format nor the content type. This action
 * takes a friendly `{title, state, …}` object and builds the document, and the
 * short names are qualified — `title` becomes `System.Title` — so a caller
 * never has to know either convention.
 *
 * A field name containing a dot is passed through untouched, which is how a
 * custom field (`Custom.TeamArea`) works.
 *
 * ## The type is in the path, and it must exist in the project's process
 *
 * `Bug`, `Task`, `User Story`, `Issue` — which of those exist depends on the
 * project's process template. Agile has `User Story`, Scrum has `Product
 * Backlog Item`, and a workflow hard-coding one breaks against a project using
 * the other. That is worth knowing before it fails at 3am rather than after.
 *
 * ## `validateOnly` is a dry run
 *
 * It runs every rule and creates nothing. For a workflow whose field values
 * come from outside — a form, another system — checking first is cheaper than
 * creating a malformed item and cleaning it up.
 */
const action: ActionDefinition = {
  key: "work-item-create",
  type: "perform",
  resource: "work-item",
  title: "Create a work item",
  description:
    "Create a Bug, Task or story. Azure DevOps wants a JSON Patch document here, not an object — " +
    "this builds it, and qualifies `title` to `System.Title` for you.",
  idempotent: false,
  params: [
    PROJECT_PARAM,
    {
      key: "type",
      label: "Work Item Type",
      type: "string",
      required: true,
      default: "Task",
      placeholder: "Bug",
      hint: "Which types exist depends on the project's process — Agile has `User Story`, Scrum " +
        "has `Product Backlog Item`, and hard-coding one breaks against the other.",
    },
    { key: "title", label: "Title", type: "string", required: true, default: "" },
    { key: "description", label: "Description", type: "text", default: "" },
    {
      key: "assignedTo",
      label: "Assign To",
      type: "string",
      default: "",
      hint: "A user's email or display name as Azure DevOps knows them.",
    },
    { key: "areaPath", label: "Area Path", type: "string", default: "", advanced: true },
    { key: "iterationPath", label: "Iteration Path", type: "string", default: "", advanced: true },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      default: "",
      hint: "Semicolon-separated — Azure DevOps's own separator, not commas.",
    },
    {
      key: "fields",
      label: "Additional Fields",
      type: "json",
      default: "",
      hint: 'Anything else, e.g. {"Microsoft.VSTS.Common.Priority": 1}. A name with a dot is ' +
        "used as-is, so custom fields work.",
    },
    {
      key: "validateOnly",
      label: "Validate Only",
      type: "boolean",
      default: false,
      hint: "Runs every rule and creates nothing — worth doing when the values came from outside.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Work Item ID" },
    { key: "url", type: "string", label: "API URL" },
    { key: "validatedOnly", type: "boolean", label: "True when nothing was created" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    const type = String(p.type ?? "").trim();
    const title = String(p.title ?? "").trim();
    if (!project) throw new Error("`project` is required");
    if (!type) throw new Error("`type` is required");
    if (!title) throw new Error("`title` is required");

    const extra = (json(p.fields, "fields") ?? {}) as Record<string, unknown>;
    const patch = fieldsToPatch({
      title,
      description: p.description,
      assignedTo: p.assignedTo,
      areaPath: p.areaPath,
      iterationPath: p.iterationPath,
      tags: p.tags,
      ...extra,
    });

    const validateOnly = p.validateOnly === true;
    const client = new AzureDevOpsClient(ctx);
    const item = await client.request<{ id?: number }>(
      // The `$` before the type is part of the path, not a typo.
      client.path(project, "_apis/wit/workitems", `$${type}`),
      {
        method: "POST",
        contentType: "application/json-patch+json",
        body: patch,
        query: query({ validateOnly: validateOnly || undefined }),
      },
    );

    ctx.log("info", validateOnly ? "validated an Azure DevOps work item" : "created one", {
      workItemId: item?.id,
      type,
    });
    return { ...item, validatedOnly: validateOnly };
  },
};

export default action;
