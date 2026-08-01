import type { ActionDefinition } from "@w6w/types";
import { SupabaseClient } from "../lib/client.ts";
import { filtersParam, selectParam, tableParam } from "../lib/params.ts";

interface Input {
  table: string;
  filters: string;
  select?: string;
}

const rowsDelete: ActionDefinition<Input> = {
  key: "rows-delete",
  type: "perform",
  resource: "rows",
  title: "Delete Row(s)",
  description: "Delete every row matching a filter. `filters` is required so a blank form " +
    "can't accidentally empty the whole table.",
  // Deleting an already-deleted row is a no-op — a retry converges.
  idempotent: true,
  params: [
    tableParam,
    filtersParam({
      required: true,
      hint: 'Raw PostgREST filter query string selecting the rows to delete, e.g. "id=eq.5". ' +
        "Required — a delete with no filter would remove every row.",
    }),
    selectParam,
  ],
  output: [
    { key: "rows", type: "array", label: "Deleted rows" },
  ],

  async execute(input, ctx) {
    if (!input.filters.trim()) {
      throw new Error("rows-delete: `filters` is required and cannot be blank.");
    }
    const rows = await new SupabaseClient(ctx).request<unknown[]>(`/${input.table}`, {
      method: "DELETE",
      query: { select: input.select || undefined },
      filters: input.filters,
      headers: { prefer: "return=representation" },
    });
    return { rows };
  },
};

export default rowsDelete;
