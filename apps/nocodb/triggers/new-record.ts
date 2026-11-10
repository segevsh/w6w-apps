import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/record-list.ts";

/**
 * NocoDB list requests take `sort` (column name, `-` prefix for descending) and `limit`
 * (REST API "Query parameters" page). Rows are keyed by their primary key, which NocoDB-created
 * tables auto-increment in insertion order, so sorting `-Id` is newest first.
 */
export default pollFromListAction<{ tableId: string; sortField?: string }>({
  key: "new-record",
  title: "New Record",
  description: "The run gets each row newly added to a NocoDB table.",
  action: action as unknown as ActionDefinition,
  input: (p) => ({
    tableId: p.tableId,
    sort: `-${(p.sortField ?? "").trim() || "Id"}`,
    limit: 100,
    offset: 0,
  }),
  items: (r) => (r as { records?: unknown[] }).records ?? [],
  idOf: (x) => {
    const row = x as { Id?: unknown; id?: unknown };
    return String(row.Id ?? row.id ?? "");
  },
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      hint: "From the List Tables action.",
    },
    {
      key: "sortField",
      label: "Auto-increment column",
      type: "string",
      default: "Id",
      hint: "The column that grows with every new row (NocoDB's default primary key is `Id`).",
    },
  ],
  output: [
    { key: "Id", type: "number", label: "Row primary key" },
    { key: "CreatedAt", type: "string", label: "Created at (when the table keeps it)" },
  ],
  sample: { Id: 42, Title: "Launch checklist", CreatedAt: "2026-11-09 10:00:00+00:00" },
  minIntervalMs: 300_000,
  maxPages: 1,
});
