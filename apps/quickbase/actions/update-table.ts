import type { ActionDefinition } from "@w6w/types";
import { compact, QuickbaseClient, resolveAppId } from "../lib/client.ts";
import type { QuickbaseTable } from "./list-tables.ts";

interface Input {
  tableId: string;
  appId?: string;
  name?: string;
  description?: string;
  singleRecordName?: string;
  pluralRecordName?: string;
}

/**
 * `POST /tables/{tableId}?appId=…` — update.
 *
 * The method really is POST, not PUT or PATCH: Quickbase uses POST for updates
 * throughout v1 (apps, tables and fields alike). Unset params are dropped by
 * `compact` so a partial update does not blank the properties it never
 * mentioned.
 */
const updateTable: ActionDefinition<Input, QuickbaseTable> = {
  key: "update-table",
  type: "perform",
  resource: "table",
  title: "Update Table",
  // `true`: writing the same properties again lands on the same state.
  idempotent: true,
  description: "Update a table's name, description or record nouns. Unset fields are left alone.",
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
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "singleRecordName", label: "Singular record name", type: "string" },
    { key: "pluralRecordName", label: "Plural record name", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Table ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new QuickbaseClient(ctx).request<QuickbaseTable>(
      `tables/${encodeURIComponent(input.tableId)}`,
      {
        method: "POST",
        query: { appId: resolveAppId(input.appId, ctx.connection) },
        body: compact({
          name: input.name,
          description: input.description,
          singleRecordName: input.singleRecordName,
          pluralRecordName: input.pluralRecordName,
        }),
      },
    );
  },
};

export default updateTable;
