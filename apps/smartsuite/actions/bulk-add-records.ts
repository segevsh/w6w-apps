import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, SmartSuiteClient } from "../lib/client.ts";

interface Input {
  tableId: string;
  items: Record<string, unknown>[];
}

/**
 * `POST /applications/{tableId}/records/bulk/` — create up to **25** records
 * in one call. More than 25 is answered with `422`.
 *
 * Each item is a record object keyed by the table's field slugs, exactly like
 * `create-record`'s `fields`. One asymmetry is worth knowing: unlike the
 * single-record endpoint, the bulk endpoint **does not enforce required
 * fields**, so a missing required slug is not a `422` here. Call `create-record`
 * (or `get-table`) when required-field validation matters.
 *
 * `idempotent: false` — a retry can duplicate the whole batch.
 */
const bulkAddRecords: ActionDefinition<Input> = {
  key: "bulk-add-records",
  type: "perform",
  resource: "record",
  title: "Bulk Add Records",
  description: "Create up to 25 records in one call (POST /applications/{tableId}/records/bulk/).",
  idempotent: false,
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      hint: "The `id` of the Table to write to.",
    },
    {
      key: "items",
      label: "Records",
      type: "json",
      required: true,
      hint: "Array of up to 25 record objects, each keyed by this table's field slugs.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Created records" },
  ],

  execute(input, ctx) {
    return new SmartSuiteClient(ctx).request(
      `applications/${encodeSegment(input.tableId)}/records/bulk/`,
      { method: "POST", body: { items: input.items } },
    );
  },
};

export default bulkAddRecords;
