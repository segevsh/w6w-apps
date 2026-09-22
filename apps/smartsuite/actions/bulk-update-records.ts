import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, SmartSuiteClient } from "../lib/client.ts";

interface Input {
  tableId: string;
  items: Record<string, unknown>[];
}

/**
 * `PATCH /applications/{tableId}/records/bulk/` — update up to **25** records
 * in one call. Each item is a partial record object and must include the
 * record's `id` alongside the field slugs being changed.
 *
 * `idempotent: true` — the same batch applied twice leaves the same values.
 */
const bulkUpdateRecords: ActionDefinition<Input> = {
  key: "bulk-update-records",
  type: "perform",
  resource: "record",
  title: "Bulk Update Records",
  description: "Update up to 25 records in one call (PATCH /applications/{tableId}/records/bulk/).",
  idempotent: true,
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      hint: "The `id` of the Table holding the records.",
    },
    {
      key: "items",
      label: "Records",
      type: "json",
      required: true,
      hint: "Array of up to 25 partial record objects, each including its `id` and the field " +
        "slugs to change.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Updated records" },
  ],

  execute(input, ctx) {
    return new SmartSuiteClient(ctx).request(
      `applications/${encodeSegment(input.tableId)}/records/bulk/`,
      { method: "PATCH", body: { items: input.items } },
    );
  },
};

export default bulkUpdateRecords;
