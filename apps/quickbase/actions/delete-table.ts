import type { ActionDefinition } from "@w6w/types";
import { QuickbaseClient, resolveAppId } from "../lib/client.ts";

interface Input {
  tableId: string;
  appId?: string;
}

interface Output {
  deletedTableId?: string;
}

/**
 * `DELETE /tables/{tableId}?appId=…`.
 *
 * Deletes the table and everything in it. Unlike `deleteApp`, Quickbase asks
 * for no name confirmation here, so the only guard is the caller's.
 */
const deleteTable: ActionDefinition<Input, Output> = {
  key: "delete-table",
  type: "perform",
  resource: "table",
  title: "Delete Table",
  // `true`: deletion converges. Re-deleting a table that is already gone is an
  // error, not a second destructive act.
  idempotent: true,
  description: "Delete a table and all of its records. Not reversible.",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      placeholder: "bck7gp3q2",
    },
    {
      key: "appId",
      label: "Application ID",
      type: "string",
      hint: "Defaults to the application recorded on the connection.",
    },
  ],
  output: [{ key: "deletedTableId", type: "string", label: "Deleted table ID" }],

  execute(input, ctx) {
    return new QuickbaseClient(ctx).request<Output>(
      `tables/${encodeURIComponent(input.tableId)}`,
      { method: "DELETE", query: { appId: resolveAppId(input.appId, ctx.connection) } },
    );
  },
};

export default deleteTable;
