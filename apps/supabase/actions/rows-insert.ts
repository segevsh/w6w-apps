import type { ActionDefinition } from "@w6w/types";
import { parseJsonParam, SupabaseClient, unset } from "../lib/client.ts";
import { selectParam, tableParam } from "../lib/params.ts";

interface Input {
  table: string;
  rows: unknown;
  upsert?: boolean;
  onConflict?: string;
  select?: string;
}

const rowsInsert: ActionDefinition<Input> = {
  key: "rows-insert",
  type: "perform",
  resource: "rows",
  title: "Insert Row(s)",
  description: "Insert one row (a JSON object) or many (a JSON array) into a table.",
  // A retry re-inserts unless `upsert` + `onConflict` make it converge instead.
  idempotent: false,
  params: [
    tableParam,
    {
      key: "rows",
      label: "Row(s)",
      type: "json",
      required: true,
      hint:
        'A single row object `{ "col": "value" }`, or an array of row objects for a bulk insert.',
    },
    { key: "upsert", label: "Upsert on conflict", type: "boolean", default: false, row: "upsert" },
    {
      key: "onConflict",
      label: "Conflict column(s)",
      type: "string",
      row: "upsert",
      advanced: true,
      hint:
        'Comma-separated unique/PK column(s), e.g. "id" or "user_id,day". Required for upsert ' +
        "to target a unique constraint other than the primary key.",
    },
    selectParam,
  ],
  output: [
    { key: "rows", type: "array", label: "Inserted (or upserted) rows" },
  ],

  async execute(input, ctx) {
    const prefer = ["return=representation"];
    // https://postgrest.org/en/stable/references/api/tables_views.html#upsert
    if (input.upsert) prefer.push("resolution=merge-duplicates");

    const rows = await new SupabaseClient(ctx).request<unknown[]>(`/${input.table}`, {
      method: "POST",
      query: {
        on_conflict: input.upsert ? unset(input.onConflict) : undefined,
        select: input.select || undefined,
      },
      body: parseJsonParam(input.rows),
      headers: { prefer: prefer.join(",") },
    });
    return { rows };
  },
};

export default rowsInsert;
