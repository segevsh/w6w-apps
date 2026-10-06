import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { asArray, tableNameParam } from "../lib/params.ts";

interface Input {
  tableName: string;
  columns?: unknown;
}

const tableCreate: ActionDefinition<Input> = {
  key: "table-create",
  type: "perform",
  resource: "table",
  title: "Create Table",
  description:
    "Create a table, optionally with columns. The first column can only be of type text, " +
    "number, date, single-select, formula or auto-number. The response is the new table's " +
    "full definition, including its `_id`.",
  idempotent: false,
  params: [
    { ...tableNameParam, hint: "Name of the new table." },
    {
      key: "columns",
      label: "Columns",
      type: "json",
      hint: 'Optional JSON array of column definitions, e.g. [{"column_name": "Name", ' +
        '"column_type": "text"}, {"column_name": "Age", "column_type": "number"}]. See Insert ' +
        "Column for the column types.",
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Table ID" },
    { key: "name", type: "string", label: "Table name" },
    { key: "columns", type: "array", label: "Columns" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = { table_name: input.tableName };
    if (input.columns !== undefined && input.columns !== "") {
      body.columns = asArray(input.columns, "Columns");
    }
    return new SeaTableClient(ctx).request("/tables/", { method: "POST", body });
  },
};

export default tableCreate;
