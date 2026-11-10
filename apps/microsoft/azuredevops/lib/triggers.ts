import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import workItemQuery from "../actions/work-item-query.ts";

interface Params {
  project: string;
}

interface WorkItem {
  id?: unknown;
  fields?: Record<string, unknown>;
}

const FIELDS = [
  "System.Title",
  "System.State",
  "System.WorkItemType",
  "System.CreatedDate",
  "System.ChangedDate",
].join(",");

/** WIQL the trigger writes itself, with an explicit ORDER BY (never a default order). */
const wiql = (orderField: "System.CreatedDate" | "System.ChangedDate") =>
  `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project ` +
  `ORDER BY [${orderField}] DESC`;

async function check(
  orderField: "System.CreatedDate" | "System.ChangedDate",
  idOf: (item: WorkItem) => string,
  params: Params,
  state: unknown,
  ctx: HookContext,
) {
  return await pollNewItems<WorkItem>({
    state,
    idOf,
    async fetchPage() {
      const result = await workItemQuery.execute(
        { project: params.project, wiql: wiql(orderField), fields: FIELDS, limit: 100 },
        ctx,
      ) as { workItems?: WorkItem[] };
      return { items: result.workItems ?? [] };
    },
  });
}

const PARAMS: TriggerDefinition<Params>["params"] = [
  { key: "project", label: "Project", type: "string", required: true },
];

const OUTPUT: TriggerDefinition["output"] = [
  { key: "id", type: "number", label: "Work item ID" },
  { key: "fields", type: "object", label: "Fetched fields (System.Title, System.State, …)" },
];

const SAMPLE = {
  id: 101,
  rev: 3,
  fields: {
    "System.Title": "Fix login",
    "System.State": "Active",
    "System.WorkItemType": "Bug",
    "System.CreatedDate": "2026-11-09T10:00:00Z",
    "System.ChangedDate": "2026-11-09T10:05:00Z",
  },
};

export function workItemTrigger(spec: { updated: boolean }): TriggerDefinition<Params> {
  return spec.updated
    ? {
      key: "new-or-updated-work-item",
      title: "New or Updated Work Item",
      description:
        "The run gets each work item in the project that is created or changed since the previous check.",
      params: PARAMS,
      output: OUTPUT,
      sample: SAMPLE,
      minIntervalMs: 300_000,
      poll: ({ params, state }, ctx) =>
        check(
          "System.ChangedDate",
          (w) => `${String(w.id ?? "")}:${String(w.fields?.["System.ChangedDate"] ?? "")}`,
          params,
          state,
          ctx,
        ),
    }
    : {
      key: "new-work-item",
      title: "New Work Item",
      description: "The run gets each work item created in the project since the previous check.",
      params: PARAMS,
      output: OUTPUT,
      sample: SAMPLE,
      minIntervalMs: 300_000,
      poll: ({ params, state }, ctx) =>
        check("System.CreatedDate", (w) => String(w.id ?? ""), params, state, ctx),
    };
}
