import type { ActionDefinition } from "@w6w/types";
import { QuickbaseClient, type QuickbaseRecordSet } from "../lib/client.ts";

interface Input {
  tableId: string;
  reportId: string;
  skip?: number;
  top?: number;
}

/**
 * `POST /reports/{reportId}/run?tableId=…&skip=…&top=…`.
 *
 * Runs a saved report and returns its underlying data in the same
 * `{ data, fields, metadata }` envelope as `query-records` — so the same
 * pagination caveat applies: `numRecords` can be less than `totalRecords` and
 * less than the `top` you asked for, and you page by advancing `skip`.
 *
 * Two details that are easy to get wrong:
 *
 *   - It is a **POST** with **no body**. The parameters are all in the query
 *     string; the paging arguments in particular are NOT body properties the
 *     way they are for `records/query`.
 *   - The response shape follows the report's *type*. Record-level reports
 *     (table, calendar) return rows; summary and chart reports return
 *     aggregated data, so a workflow that assumes one row per record will be
 *     wrong for a summary report.
 */
const runReport: ActionDefinition<Input, QuickbaseRecordSet> = {
  key: "run-report",
  type: "search",
  resource: "report",
  title: "Run Report",
  description:
    "Run a saved report and return its data. Shape follows the report type — record-level reports return rows, summary reports return aggregates.",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      placeholder: "bck7gp3q2",
    },
    { key: "reportId", label: "Report ID", type: "string", required: true, placeholder: "1" },
    { key: "skip", label: "Skip", type: "number", hint: "Records to skip — the paging cursor." },
    {
      key: "top",
      label: "Top",
      type: "number",
      hint: "Maximum records to return. Quickbase may return fewer.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Rows (keyed by field ID)" },
    { key: "fields", type: "array", label: "Field ID → label map" },
    { key: "metadata", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new QuickbaseClient(ctx).request<QuickbaseRecordSet>(
      `reports/${encodeURIComponent(input.reportId)}/run`,
      {
        method: "POST",
        query: { tableId: input.tableId, skip: input.skip, top: input.top },
      },
    );
  },
};

export default runReport;
