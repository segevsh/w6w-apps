import type { ActionDefinition } from "@w6w/types";
import { QuickbaseClient } from "../lib/client.ts";
import type { QuickbaseReport } from "./list-reports.ts";

interface Input {
  tableId: string;
  reportId: string;
}

/**
 * `GET /reports/{reportId}?tableId=…` — a report's definition, not its data.
 *
 * Use this to read the saved filter and columns; use `run-report` to execute it.
 */
const getReport: ActionDefinition<Input, QuickbaseReport> = {
  key: "get-report",
  type: "read",
  resource: "report",
  title: "Get Report",
  description: "Get one report's definition — its filter, columns and usage stats.",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      placeholder: "bck7gp3q2",
    },
    { key: "reportId", label: "Report ID", type: "string", required: true, placeholder: "1" },
  ],
  output: [
    { key: "id", type: "string", label: "Report ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Report type" },
    { key: "query", type: "object", label: "Saved query" },
  ],

  execute(input, ctx) {
    return new QuickbaseClient(ctx).request<QuickbaseReport>(
      `reports/${encodeURIComponent(input.reportId)}`,
      { query: { tableId: input.tableId } },
    );
  },
};

export default getReport;
