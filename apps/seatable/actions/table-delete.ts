import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { tableNameParam } from "../lib/params.ts";

interface Input {
  tableName: string;
}

const tableDelete: ActionDefinition<Input> = {
  key: "table-delete",
  type: "perform",
  resource: "table",
  title: "Delete Table",
  description: "Delete a table and all its rows, identified by name. Destructive.",
  idempotent: true,
  params: [tableNameParam],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new SeaTableClient(ctx).request("/tables/", {
      method: "DELETE",
      body: { table_name: input.tableName },
    });
  },
};

export default tableDelete;
