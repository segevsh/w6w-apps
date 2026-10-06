import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { asStringArray, rowIdsParam, tableNameParam } from "../lib/params.ts";

interface Input {
  tableName: string;
  rowIds: unknown;
}

const rowLock: ActionDefinition<Input> = {
  key: "row-lock",
  type: "perform",
  resource: "row",
  title: "Lock Rows",
  description:
    "Lock rows so they cannot be edited. Already-locked rows may be included. An advanced " +
    "feature of SeaTable's enterprise subscriptions; rows in the big-data backend cannot be locked.",
  idempotent: true,
  params: [tableNameParam, rowIdsParam],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new SeaTableClient(ctx).request("/lock-rows/", {
      method: "PUT",
      body: { table_name: input.tableName, row_ids: asStringArray(input.rowIds, "Row IDs") },
    });
  },
};

export default rowLock;
