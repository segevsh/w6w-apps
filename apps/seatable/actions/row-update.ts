import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { asArray, tableNameParam } from "../lib/params.ts";

interface Input {
  tableName: string;
  updates: unknown;
}

const rowUpdate: ActionDefinition<Input> = {
  key: "row-update",
  type: "perform",
  resource: "row",
  title: "Update Rows",
  description:
    "Change values in one or more existing rows (up to 1,000 per call). Only the columns named " +
    "in each `row` object change. Keyed by column NAME; an unknown name is silently ignored.",
  idempotent: true,
  params: [
    tableNameParam,
    {
      key: "updates",
      label: "Updates",
      type: "json",
      required: true,
      hint: 'A JSON array of {"row_id", "row"} objects, e.g. ' +
        '[{"row_id": "Bko1e60YT-egit2SljWSZA", "row": {"Name": "Max"}}].',
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    const updates = asArray(input.updates, "Updates");
    if (updates.length === 0) throw new Error("Updates must contain at least one entry");
    return new SeaTableClient(ctx).request("/rows/", {
      method: "PUT",
      body: { table_name: input.tableName, updates },
    });
  },
};

export default rowUpdate;
