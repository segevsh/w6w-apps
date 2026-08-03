import type { ActionDefinition } from "@w6w/types";
import { QuickbaseClient } from "../lib/client.ts";

interface Input {
  tableId: string;
}

export interface QuickbaseReport {
  id?: string;
  name?: string;
  type?: string;
  description?: string;
  ownerId?: number;
  query?: {
    tableId?: string;
    filter?: string;
    formulaFields?: Array<Record<string, unknown>>;
  };
  properties?: Record<string, unknown>;
  usedLast?: string;
  usedCount?: number;
}

/**
 * `GET /reports?tableId=…`.
 *
 * A report is a saved query with its filter, sort and columns already decided
 * by whoever built the app — which makes `run-report` the better choice than
 * `query-records` when the business logic already lives in Quickbase and you do
 * not want to restate it in a workflow.
 *
 * Note the naming: a report's filter is `query.filter`, not `where`, though it
 * is the same query language.
 *
 * Per the spec, an app administrator running this also sees other users'
 * **personal** reports (each tagged with its `ownerId`), so the list can be
 * longer for an admin token than for anyone else.
 */
const listReports: ActionDefinition<Input, QuickbaseReport[]> = {
  key: "list-reports",
  type: "read",
  resource: "report",
  title: "List Reports",
  description: "List the saved reports on a table, with their filters and column definitions.",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      placeholder: "bck7gp3q2",
    },
  ],
  output: [{ key: "reports", type: "array", label: "Reports" }],

  execute(input, ctx) {
    return new QuickbaseClient(ctx).request<QuickbaseReport[]>("reports", {
      query: { tableId: input.tableId },
    });
  },
};

export default listReports;
