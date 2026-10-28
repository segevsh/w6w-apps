import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient, csv, qualifyField, query } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /{org}/{project}/_apis/wit/workitems/{id}` — one work item.
 *
 * ## Fields are namespaced, and the namespace is not decoration
 *
 * A work item's values live under `fields`, keyed by fully-qualified names:
 * `System.Title`, `System.State`, `System.AssignedTo`,
 * `Microsoft.VSTS.Common.Priority`. There is no `title`.
 *
 * That makes reading one awkward in a workflow — every downstream step has to
 * know the namespace — so this action returns the raw `fields` **and** a
 * flattened set of the common ones under short names. Both, because a custom
 * field has no short name and dropping the raw object would lose it.
 *
 * The `fields` parameter accepts short names too and qualifies them, so asking
 * for `title,state` works. Naming fields is worth doing: a work item with a
 * long description and a full revision history is a large object to carry
 * through a workflow that wanted its title.
 *
 * `$expand=relations` is how the linked pull requests, parents and children
 * appear — they are absent otherwise, which reads as an unlinked item.
 */
const SHORT: Record<string, string> = {
  "System.Title": "title",
  "System.State": "state",
  "System.WorkItemType": "type",
  "System.AssignedTo": "assignedTo",
  "System.AreaPath": "areaPath",
  "System.IterationPath": "iterationPath",
  "System.Tags": "tags",
  "System.CreatedDate": "createdDate",
  "System.ChangedDate": "changedDate",
  "Microsoft.VSTS.Common.Priority": "priority",
};

const action: ActionDefinition = {
  key: "work-item-get",
  type: "read",
  resource: "work-item",
  title: "Get a work item",
  description:
    "One work item. Its values are namespaced — `System.Title`, not `title` — so this returns " +
    "both the raw fields and the common ones flattened under short names.",
  params: [
    PROJECT_PARAM,
    { key: "workItemId", label: "Work Item ID", type: "string", required: true, default: "" },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "",
      hint: "Comma-separated; short names like `title,state` are qualified for you. Naming them " +
        "avoids carrying a long description and full history through the workflow.",
    },
    {
      key: "expandRelations",
      label: "Include Links",
      type: "boolean",
      default: false,
      hint: "Linked pull requests, parents and children. Absent otherwise, which reads as an " +
        "unlinked item.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Work Item ID" },
    { key: "fields", type: "object", label: "The raw namespaced fields" },
    { key: "flat", type: "object", label: "The common fields under short names" },
    { key: "relations", type: "array", label: "Links, when asked for" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    const workItemId = String(p.workItemId ?? "").trim();
    if (!project) throw new Error("`project` is required");
    if (!workItemId) throw new Error("`workItemId` is required");

    const fields = csv(p.fields)?.map(qualifyField);
    const expand = p.expandRelations === true ? "relations" : undefined;

    const client = new AzureDevOpsClient(ctx);
    const item = await client.request<{ fields?: Record<string, unknown> }>(
      client.path(project, "_apis/wit/workitems", workItemId),
      {
        query: query({
          // Azure DevOps rejects `fields` and `$expand` together.
          fields: expand ? undefined : fields?.join(","),
          $expand: expand,
        }),
      },
    );

    const raw = item?.fields ?? {};
    const flat: Record<string, unknown> = {};
    for (const [name, short] of Object.entries(SHORT)) {
      if (name in raw) flat[short] = raw[name];
    }

    return { ...item, flat };
  },
};

export default action;
