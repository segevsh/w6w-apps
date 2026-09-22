import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, SmartSuiteClient } from "../lib/client.ts";

interface Input {
  tableId: string;
  recordId: string;
}

/**
 * `DELETE /applications/{tableId}/records/{recordId}/` — delete one record.
 *
 * `idempotent: true` — deleting an already-deleted record leaves the table in
 * the requested state, so a retry is harmless.
 */
const deleteRecord: ActionDefinition<Input> = {
  key: "delete-record",
  type: "perform",
  resource: "record",
  title: "Delete Record",
  description:
    "Delete a record from a SmartSuite Table (DELETE /applications/{tableId}/records/{recordId}/).",
  idempotent: true,
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      hint: "The `id` of the Table holding the record.",
    },
    {
      key: "recordId",
      label: "Record ID",
      type: "string",
      required: true,
      hint: "The `id` of the record to delete.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Whether the delete was accepted" },
  ],

  execute(input, ctx) {
    return new SmartSuiteClient(ctx).request(
      `applications/${encodeSegment(input.tableId)}/records/${encodeSegment(input.recordId)}/`,
      { method: "DELETE" },
    );
  },
};

export default deleteRecord;
