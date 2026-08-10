import type { ActionDefinition } from "@w6w/types";
import { MetabaseClient } from "../lib/client.ts";

/**
 * `GET /api/database/{id}/metadata` — the schema of one database as Metabase
 * understands it.
 *
 * This is the introspection step before writing a native query: it returns the
 * database record with a `tables` array, each table carrying its own `fields`
 * with names, base types and semantic types. Verified live against the sample
 * database: eight tables (`ACCOUNTS`, `ANALYTIC_EVENTS`, `FEEDBACK`, `INVOICES`,
 * `ORDERS`, `PEOPLE`, `PRODUCTS`, `REVIEWS`), each with a numeric `id` usable as
 * an MBQL `source-table`.
 *
 * ## It is Metabase's picture, not the database's
 *
 * The distinction matters. This metadata comes from Metabase's **sync**, which
 * runs on a schedule (`metadata_sync_schedule` is on the database record). A
 * table created five minutes ago will not be here, and a column dropped
 * yesterday may still be. It is the right source for building an MBQL query —
 * because MBQL addresses Metabase's field ids, which only exist in this
 * picture — and the wrong source for "what is in the warehouse right now",
 * which a native `information_schema` query answers properly.
 *
 * There is a `POST /api/database/{id}/sync_schema` that forces a re-sync. It is
 * not shipped: it is an admin-scoped, potentially long-running side effect on a
 * shared resource, and an action whose honest description is "make the whole
 * instance busy for a while" does not belong in a workflow step alongside
 * read-only introspection. See the README's "not implemented" list.
 */
interface Input {
  databaseId: number;
  skipFields?: boolean;
}

const databaseMetadata: ActionDefinition<Input> = {
  key: "database-metadata",
  type: "read",
  resource: "database",
  title: "Get Database Metadata",
  description:
    "Fetch one database's tables and fields as Metabase's last sync recorded them — the source " +
    "for MBQL table and field ids.",
  params: [
    {
      key: "databaseId",
      label: "Database ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "From List Databases.",
    },
    {
      key: "skipFields",
      label: "Tables only",
      type: "boolean",
      default: false,
      hint: "Omit each table's field list. Much smaller on a wide warehouse, and enough when you " +
        "only need table ids.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Database ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "engine", type: "string", label: "Driver" },
    { key: "tables", type: "array", label: "Tables" },
    { key: "tables.id", type: "number", label: "Table ID — MBQL `source-table`" },
    { key: "tables.name", type: "string", label: "Table name" },
    { key: "tables.schema", type: "string", label: "Schema" },
    { key: "tables.fields", type: "array", label: "Columns" },
    { key: "features", type: "array", label: "Driver capabilities" },
    { key: "metadata_sync_schedule", type: "string", label: "Sync schedule (cron)" },
  ],

  execute(input, ctx) {
    return new MetabaseClient(ctx).request(
      `/api/database/${encodeURIComponent(String(input.databaseId))}/metadata`,
      { query: { skip_fields: input.skipFields } },
    );
  },
};

export default databaseMetadata;
