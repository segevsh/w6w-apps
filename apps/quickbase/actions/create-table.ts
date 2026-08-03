import type { ActionDefinition } from "@w6w/types";
import { compact, QuickbaseClient, resolveAppId } from "../lib/client.ts";
import type { QuickbaseTable } from "./list-tables.ts";

interface Input {
  name: string;
  appId?: string;
  description?: string;
  singleRecordName?: string;
  pluralRecordName?: string;
}

/**
 * `POST /tables?appId=…`.
 *
 * `singleRecordName` / `pluralRecordName` are the nouns Quickbase's UI uses for
 * a row ("Customer" / "Customers"). They are cosmetic, and Quickbase derives
 * them from the table name when they are omitted.
 */
const createTable: ActionDefinition<Input, QuickbaseTable> = {
  key: "create-table",
  type: "perform",
  resource: "table",
  title: "Create Table",
  // `false`: every call mints a new table id. Quickbase enforces no uniqueness
  // on table names, so a retry silently produces a second identical table
  // rather than failing.
  idempotent: false,
  description: "Create a table in a Quickbase application.",
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "appId",
      label: "Application ID",
      type: "string",
      hint: "Defaults to the application recorded on the connection.",
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "singleRecordName",
      label: "Singular record name",
      type: "string",
      placeholder: "Customer",
    },
    {
      key: "pluralRecordName",
      label: "Plural record name",
      type: "string",
      placeholder: "Customers",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Table ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new QuickbaseClient(ctx).request<QuickbaseTable>("tables", {
      method: "POST",
      query: { appId: resolveAppId(input.appId, ctx.connection) },
      body: compact({
        name: input.name,
        description: input.description,
        singleRecordName: input.singleRecordName,
        pluralRecordName: input.pluralRecordName,
      }),
    });
  },
};

export default createTable;
