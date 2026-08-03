import type { ActionDefinition } from "@w6w/types";
import { QuickbaseClient, resolveAppId } from "../lib/client.ts";
import type { QuickbaseTable } from "./list-tables.ts";

interface Input {
  tableId: string;
  appId?: string;
}

/**
 * `GET /tables/{tableId}?appId=…`.
 *
 * `appId` is required by the spec even though a table id is already unique
 * across Quickbase — the API asks for both, so both are sent.
 */
const getTable: ActionDefinition<Input, QuickbaseTable> = {
  key: "get-table",
  type: "read",
  resource: "table",
  title: "Get Table",
  description: "Get one table's properties, including its key field and space usage.",
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
  output: [
    { key: "id", type: "string", label: "Table ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "keyFieldId", type: "number", label: "Key field ID" },
    { key: "spaceRemaining", type: "string", label: "Space remaining" },
  ],

  execute(input, ctx) {
    return new QuickbaseClient(ctx).request<QuickbaseTable>(
      `tables/${encodeURIComponent(input.tableId)}`,
      { query: { appId: resolveAppId(input.appId, ctx.connection) } },
    );
  },
};

export default getTable;
