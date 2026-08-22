import type { ActionDefinition } from "@w6w/types";
import { csv, NocoDBClient, query } from "../lib/client.ts";

/**
 * `GET /api/v2/tables/{tableId}/records/{recordId}` — one row, by primary key.
 *
 * ## The record id is the primary key, not the row number
 *
 * NocoDB's default primary key column is `Id`, an auto-incrementing integer,
 * and it is what this takes. The position of a row in a view is not an
 * identifier and changes whenever anybody sorts.
 *
 * On a table whose primary key is something else — a base created from an
 * existing database, say — the id is that column's value, and it may not be a
 * number at all.
 *
 * ## The exact read, against `record-list`'s filtered one
 *
 * A `where` that matches nothing returns an empty list with a 200. This
 * returns `ERR_RECORD_NOT_FOUND` with a 404, which is a genuine answer rather
 * than an absence — the right call whenever a workflow already has the id.
 */
const action: ActionDefinition = {
  key: "record-get",
  type: "read",
  resource: "record",
  title: "Get a record",
  description:
    "One row by its PRIMARY KEY — not its position in a view, which changes whenever anybody " +
    "sorts. Unlike a filtered list, a missing record here is a 404 rather than an empty result.",
  params: [
    { key: "tableId", label: "Table ID", type: "string", required: true, default: "" },
    {
      key: "recordId",
      label: "Record ID",
      type: "string",
      required: true,
      default: "",
      hint: "The value of the table's primary key column — usually `Id`.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "",
      hint: "Comma-separated, to keep the response small.",
    },
  ],
  output: [
    { key: "record", type: "object", label: "The row" },
    { key: "id", type: "string", label: "Its primary key" },
    { key: "fields", type: "array", label: "The column names it carries" },
    { key: "found", type: "boolean", label: "Whether it exists" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tableId = String(p.tableId ?? "").trim();
    if (!tableId) throw new Error("`tableId` is required");
    const recordId = String(p.recordId ?? "").trim();
    if (!recordId) throw new Error("`recordId` is required");

    const record = await new NocoDBClient(ctx).request<Record<string, unknown>>(
      `/api/v2/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`,
      { query: query({ fields: csv(p.fields)?.join(",") }) },
    );

    return {
      record,
      id: String(record?.Id ?? record?.id ?? recordId),
      // Names only — the values are the customer's data.
      fields: Object.keys(record ?? {}),
      found: Boolean(record),
    };
  },
};

export default action;
