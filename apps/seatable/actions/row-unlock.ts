import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { asStringArray, rowIdsParam, tableNameParam } from "../lib/params.ts";

interface Input {
  tableName: string;
  rowIds: unknown;
}

const rowUnlock: ActionDefinition<Input> = {
  key: "row-unlock",
  type: "perform",
  resource: "row",
  title: "Unlock Rows",
  description: "Unlock rows that were locked. An advanced feature of the enterprise subscriptions.",
  idempotent: true,
  params: [tableNameParam, rowIdsParam],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new SeaTableClient(ctx).request("/unlock-rows/", {
      method: "PUT",
      body: { table_name: input.tableName, row_ids: asStringArray(input.rowIds, "Row IDs") },
    });
  },
};

export default rowUnlock;
