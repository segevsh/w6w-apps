import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/rows-list.ts";

export default pollFromListAction<{ table: string; createdAtColumn?: string }>({
  key: "new-row",
  title: "New Row",
  description: "The run gets each newly created row in the selected table.",
  action: action as unknown as ActionDefinition,
  input: ({ table, createdAtColumn }) => ({
    table,
    select: "*",
    order: `${createdAtColumn ?? "created_at"}.desc`,
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
      hint: "A column whose descending order puts new rows first.",
    },
  ],
  items: (result) => (result as { rows?: unknown[] }).rows ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Row ID" }],
  sample: { id: "row_101", created_at: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});
