import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, SmartSuiteClient } from "../lib/client.ts";

interface Input {
  tableId: string;
  items: string[];
}

/**
 * `PATCH /applications/{tableId}/records/bulk_delete/?fields=id` — delete up
 * to **25** records in one call.
 *
 * Two things make this endpoint unusual, and both are reproduced verbatim
 * rather than "cleaned up": the verb is **PATCH**, not DELETE, and the payload
 * is `{ "items": ["<recordId>", …] }` — record-id **strings**, not record
 * objects. The `?fields=id` query is part of the documented path.
 *
 * `idempotent: true` — deleting an already-deleted id leaves the table in the
 * requested state.
 */
const bulkDeleteRecords: ActionDefinition<Input> = {
  key: "bulk-delete-records",
  type: "perform",
  resource: "record",
  title: "Bulk Delete Records",
  description:
    "Delete up to 25 records in one call (PATCH /applications/{tableId}/records/bulk_delete/?fields=id).",
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
      label: "Record IDs",
      type: "json",
      required: true,
      hint: "Array of up to 25 record-id strings.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Whether the batch was accepted" },
  ],

  execute(input, ctx) {
    return new SmartSuiteClient(ctx).request(
      `applications/${encodeSegment(input.tableId)}/records/bulk_delete/`,
      {
        method: "PATCH",
        query: { fields: "id" },
        body: { items: input.items },
      },
    );
  },
};

export default bulkDeleteRecords;
