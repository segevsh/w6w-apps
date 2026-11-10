import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/rows-list.ts";

// PostgREST: "The reserved word order reorders the response rows … order=age.desc,height.asc",
// "add nullsfirst or nullslast" (https://docs.postgrest.org/en/stable/references/api/tables_views.html,
// verified 2026-11-09). Rows are requested sorted by the caller's creation column, newest first.
export default pollFromListAction<{ table: string; createdAtColumn: string }>({
  key: "new-row",
  title: "New Row",
  description:
    "The run gets each newly created row in the selected table (which needs a unique id column), found by sorting on the creation timestamp column you name.",
  action: action as unknown as ActionDefinition,
  input: ({ table, createdAtColumn }) => ({
    table,
    select: "*",
    order: `${createdAtColumn}.desc.nullslast,id.desc`,
    limit: 100,
    offset: 0,
  }),
  params: [
    { key: "table", label: "Table", type: "string", required: true },
    {
      key: "createdAtColumn",
      label: "Creation timestamp column",
      type: "string",
      required: true,
      hint: "A column set once when the row is inserted (for example created_at). Rows are " +
        "requested sorted by it, newest first.",
    },
  ],
  items: (result) => (result as { rows?: unknown[] }).rows ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Row ID (the table's id column)" },
    { key: "created_at", type: "string", label: "Creation timestamp (the column you chose)" },
  ],
  sample: { id: "row_101", created_at: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});
