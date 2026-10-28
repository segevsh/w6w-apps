import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient, fieldsToPatch, json, query } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `PATCH /{org}/{project}/_apis/wit/workitems/{id}` — change a work item.
 *
 * Same JSON Patch document as creation, same `application/json-patch+json`, and
 * the same short-name qualification. Only the named fields change; everything
 * else is left alone.
 *
 * ## Moving state runs the process's rules
 *
 * A transition Azure DevOps considers invalid — closing a Bug that was never
 * activated, on a process that forbids it — is **rejected**, and the message
 * names the rule rather than the field. That is correct behaviour and a
 * frequent surprise for a workflow that assumes states are freely assignable.
 *
 * `bypassRules` exists and this action does not offer it: skipping the process
 * rules from an automation is how a board ends up with items in states its own
 * reports do not recognise. If a transition is genuinely wrong, the process is
 * the thing to change.
 *
 * ## `System.History` is how you leave a comment
 *
 * Setting it appends to the discussion rather than overwriting anything —
 * unlike every other field here. That is the supported way for an automation to
 * say *why* it changed something, and it is worth doing: a state change with no
 * explanation is indistinguishable from a mistake.
 */
const action: ActionDefinition = {
  key: "work-item-update",
  type: "perform",
  resource: "work-item",
  title: "Update a work item",
  description:
    "Change named fields; everything else is left alone. Setting `history` appends a comment " +
    "rather than overwriting — the supported way for an automation to say why.",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    { key: "workItemId", label: "Work Item ID", type: "string", required: true, default: "" },
    { key: "title", label: "Title", type: "string", default: "" },
    {
      key: "state",
      label: "State",
      type: "string",
      default: "",
      hint: "The project's process decides which transitions are legal, and rejects the rest by " +
        "name.",
    },
    { key: "assignedTo", label: "Assign To", type: "string", default: "" },
    {
      key: "history",
      label: "Comment",
      type: "text",
      default: "",
      hint: "Appends to the discussion. A state change with no explanation is indistinguishable " +
        "from a mistake.",
    },
    { key: "tags", label: "Tags", type: "string", default: "", advanced: true },
    { key: "areaPath", label: "Area Path", type: "string", default: "", advanced: true },
    { key: "iterationPath", label: "Iteration Path", type: "string", default: "", advanced: true },
    {
      key: "fields",
      label: "Additional Fields",
      type: "json",
      default: "",
      hint: "Anything else, by qualified name.",
    },
    {
      key: "validateOnly",
      label: "Validate Only",
      type: "boolean",
      default: false,
      hint: "Runs the process rules and changes nothing.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Work Item ID" },
    { key: "rev", type: "number", label: "The new revision number" },
    { key: "validatedOnly", type: "boolean", label: "True when nothing was changed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    const workItemId = String(p.workItemId ?? "").trim();
    if (!project) throw new Error("`project` is required");
    if (!workItemId) throw new Error("`workItemId` is required");

    const extra = (json(p.fields, "fields") ?? {}) as Record<string, unknown>;
    const patch = fieldsToPatch({
      title: p.title,
      state: p.state,
      assignedTo: p.assignedTo,
      history: p.history,
      tags: p.tags,
      areaPath: p.areaPath,
      iterationPath: p.iterationPath,
      ...extra,
    });
    if (patch.length === 0) {
      throw new Error("nothing to update — give at least one field to change");
    }

    const validateOnly = p.validateOnly === true;
    const client = new AzureDevOpsClient(ctx);
    const item = await client.request<{ id?: number; rev?: number }>(
      client.path(project, "_apis/wit/workitems", workItemId),
      {
        method: "PATCH",
        contentType: "application/json-patch+json",
        body: patch,
        query: query({ validateOnly: validateOnly || undefined }),
      },
    );

    // The id and which fields moved — never their values.
    ctx.log("info", "updated an Azure DevOps work item", {
      workItemId,
      changed: patch.map((op) => op.path.replace("/fields/", "")),
    });
    return { ...item, validatedOnly: validateOnly };
  },
};

export default action;
