import type { ActionDefinition } from "@w6w/types";
import { parseJsonParam, SupabaseClient } from "../lib/client.ts";
import { filtersParam, selectParam, tableParam } from "../lib/params.ts";

interface Input {
  table: string;
  filters: string;
  set: unknown;
  select?: string;
}

const rowsUpdate: ActionDefinition<Input> = {
  key: "rows-update",
  type: "perform",
  resource: "rows",
  title: "Update Row(s)",
  description: "Set columns on every row matching a filter. `filters` is required so a blank " +
    "form can't accidentally rewrite the whole table.",
  // Re-applying the same column values to the same filter converges on the
  // same end state, so a retry is safe.
  idempotent: true,
  params: [
    tableParam,
    filtersParam({
      required: true,
      hint: 'Raw PostgREST filter query string selecting the rows to update, e.g. "id=eq.5". ' +
        "Required — an update with no filter would touch every row.",
    }),
    {
      key: "set",
      label: "Columns to set",
      type: "json",
      required: true,
      hint: 'JSON object of column -> new value, e.g. { "status": "done" }.',
    },
    selectParam,
  ],
  output: [
    { key: "rows", type: "array", label: "Updated rows" },
  ],

  async execute(input, ctx) {
    if (!input.filters.trim()) {
      throw new Error("rows-update: `filters` is required and cannot be blank.");
    }
    const rows = await new SupabaseClient(ctx).request<unknown[]>(`/${input.table}`, {
      method: "PATCH",
      query: { select: input.select || undefined },
      filters: input.filters,
      body: parseJsonParam(input.set),
      headers: { prefer: "return=representation" },
    });
    return { rows };
  },
};

export default rowsUpdate;
