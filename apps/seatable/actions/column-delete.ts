import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { tableNameParam } from "../lib/params.ts";

interface Input {
  tableName: string;
  column: string;
}

const columnDelete: ActionDefinition<Input> = {
  key: "column-delete",
  type: "perform",
  resource: "column",
  title: "Delete Column",
  description: "Delete a column, by name or key, with all its data. Destructive.",
  idempotent: true,
  params: [
    tableNameParam,
    { key: "column", label: "Column name or key", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new SeaTableClient(ctx).request("/columns/", {
      method: "DELETE",
      body: { table_name: input.tableName, column: input.column },
    });
  },
};

export default columnDelete;
