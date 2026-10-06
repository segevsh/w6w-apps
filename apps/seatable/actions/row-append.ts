import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { asArray, tableNameParam } from "../lib/params.ts";

interface Input {
  tableName: string;
  rows: unknown;
  applyDefault?: boolean;
}

const rowAppend: ActionDefinition<Input> = {
  key: "row-append",
  type: "perform",
  resource: "row",
  title: "Append Rows",
  description:
    "Add one or more rows (up to 1,000 per call) to a table. Row objects are keyed by column " +
    "NAME — internal column keys are not accepted here, and a name that matches no column is " +
    "silently ignored rather than rejected, so check the result.",
  idempotent: false,
  params: [
    tableNameParam,
    {
      key: "rows",
      label: "Rows",
      type: "json",
      required: true,
      hint: 'A JSON array of row objects, e.g. [{"Name": "Max", "Age": 21, "Checkbox": true}].',
    },
    {
      key: "applyDefault",
      label: "Apply column defaults",
      type: "boolean",
      hint: "Fill columns you left out with their configured default values.",
    },
  ],
  output: [
    { key: "inserted_row_count", type: "number", label: "Rows inserted" },
    { key: "row_ids", type: "array", label: "New row IDs" },
    { key: "first_row", type: "object", label: "First inserted row" },
  ],

  execute(input, ctx) {
    const rows = asArray(input.rows, "Rows");
    if (rows.length === 0) throw new Error("Rows must contain at least one row object");
    const body: Record<string, unknown> = { table_name: input.tableName, rows };
    if (input.applyDefault !== undefined) body.apply_default = input.applyDefault;
    return new SeaTableClient(ctx).request("/rows/", { method: "POST", body });
  },
};

export default rowAppend;
