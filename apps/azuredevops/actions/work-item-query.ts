import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient, csv, qualifyField, query } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /{org}/{project}/_apis/wit/wiql` — query work items with WIQL, and get
 * back something usable.
 *
 * ## WIQL returns ids, not work items
 *
 * This is the trap the action exists to close. A WIQL query answers with
 * `workItems: [{id, url}]` — **no fields at all**, whatever the `SELECT` clause
 * said. A workflow that runs a query and reads `System.Title` from the result
 * gets nothing, and the query looked like it worked.
 *
 * Getting the actual data is a second call to the batch endpoint. This action
 * does both: it runs the query, takes the ids, and fetches the fields, so the
 * output is work items rather than a list of numbers.
 *
 * ## The batch endpoint caps at 200
 *
 * So a query matching a thousand items needs five calls. This action fetches
 * up to `limit` items in batches of 200 and reports `totalMatched` separately
 * from what it returned — a report saying "200 bugs" when the query matched
 * nine hundred is worse than one that admits it truncated.
 *
 * ## WIQL is SQL-shaped and is not SQL
 *
 * `SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'`. Field
 * names go in square brackets, `@Me` and `@Today` are supported, and
 * `ORDER BY` works. There are no joins beyond the link queries.
 */
const BATCH_SIZE = 200;

const action: ActionDefinition = {
  key: "work-item-query",
  type: "search",
  resource: "work-item",
  title: "Query work items (WIQL)",
  description:
    "Run a WIQL query and get work items back. WIQL itself returns only IDS — whatever the " +
    "SELECT said — so this fetches the fields for you in batches.",
  params: [
    PROJECT_PARAM,
    {
      key: "wiql",
      label: "Query",
      type: "text",
      required: true,
      default: "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'",
      hint: "SQL-shaped but not SQL: field names in square brackets, `@Me` and `@Today` " +
        "supported, no joins.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "title,state,type,assignedTo",
      hint: "Which fields to fetch for each match — short names are qualified. This is what the " +
        "query's own SELECT clause does NOT control.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 200,
      hint: "Fetched in batches of 200, which is Azure DevOps's cap per batch call.",
    },
  ],
  output: [
    { key: "workItems", type: "array", label: "Work items, with their fields" },
    { key: "count", type: "number", label: "Work items returned" },
    { key: "totalMatched", type: "number", label: "How many the query matched, before the limit" },
    { key: "truncated", type: "boolean", label: "True when more matched than were returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.project ?? "").trim();
    const wiql = String(p.wiql ?? "").trim();
    if (!project) throw new Error("`project` is required");
    if (!wiql) throw new Error("`wiql` is required");

    const client = new AzureDevOpsClient(ctx);
    const want = Math.max(1, Number(p.limit ?? 200));

    // Step one: the query, which answers with ids and nothing else.
    const result = await client.request<{ workItems?: Array<{ id?: number }> }>(
      client.path(project, "_apis/wit/wiql"),
      { method: "POST", body: { query: wiql }, query: query({ $top: want }) },
    );
    const ids = (result?.workItems ?? []).map((w) => Number(w?.id)).filter((n) =>
      Number.isFinite(n)
    );

    if (ids.length === 0) {
      ctx.log("info", "ran a WIQL query with no matches", { count: 0 });
      return { workItems: [], count: 0, totalMatched: 0, truncated: false };
    }

    // Step two: the fields, in batches of 200.
    const fields = csv(p.fields)?.map(qualifyField);
    const wanted = ids.slice(0, want);
    const workItems: unknown[] = [];
    for (let i = 0; i < wanted.length; i += BATCH_SIZE) {
      const batch = await client.request<{ value?: unknown[] }>(
        client.path(project, "_apis/wit/workitemsbatch"),
        {
          method: "POST",
          body: { ids: wanted.slice(i, i + BATCH_SIZE), fields },
        },
      );
      workItems.push(...(batch?.value ?? []));
    }

    ctx.log("info", "ran a WIQL query", { count: workItems.length, matched: ids.length });
    return {
      workItems,
      count: workItems.length,
      totalMatched: ids.length,
      truncated: ids.length > wanted.length,
    };
  },
};

export default action;
