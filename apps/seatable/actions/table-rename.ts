import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { tableNameParam } from "../lib/params.ts";

interface Input {
  tableName: string;
  newTableName: string;
}

const tableRename: ActionDefinition<Input> = {
  key: "table-rename",
  type: "perform",
  resource: "table",
  title: "Rename Table",
  description:
    "Rename a table. Later calls must use the new name, so a workflow that renames and then " +
    "reads should pass the new name on.",
  idempotent: false,
  params: [
    tableNameParam,
    { key: "newTableName", label: "New table name", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new SeaTableClient(ctx).request("/tables/", {
      method: "PUT",
      body: { table_name: input.tableName, new_table_name: input.newTableName },
    });
  },
};

export default tableRename;
