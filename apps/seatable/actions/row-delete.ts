import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { asStringArray, rowIdsParam, tableNameParam } from "../lib/params.ts";

interface Input {
  tableName: string;
  rowIds: unknown;
}

const rowDelete: ActionDefinition<Input> = {
  key: "row-delete",
  type: "perform",
  resource: "row",
  title: "Delete Rows",
  description:
    "Delete rows by ID (up to 10,000 per call), from the normal or the big-data backend. " +
    "Destructive: there is no undo in this API.",
  idempotent: true,
  params: [tableNameParam, rowIdsParam],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new SeaTableClient(ctx).request("/rows/", {
      method: "DELETE",
      body: { table_name: input.tableName, row_ids: asStringArray(input.rowIds, "Row IDs") },
    });
  },
};

export default rowDelete;
