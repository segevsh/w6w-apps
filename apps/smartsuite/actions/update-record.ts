import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, SmartSuiteClient } from "../lib/client.ts";

interface Input {
  tableId: string;
  recordId: string;
  fields: Record<string, unknown>;
}

/**
 * `PATCH /applications/{tableId}/records/{recordId}/` — update one record.
 *
 * The body is a partial record object keyed by the table's field slugs (the
 * same opaque shape as `create-record`); only the supplied slugs are changed.
 *
 * `idempotent: true` — PATCHing the same field values again is safe, and that
 * is what makes it safe for a workflow engine to retry after a timeout.
 */
const updateRecord: ActionDefinition<Input> = {
  key: "update-record",
  type: "perform",
  resource: "record",
  title: "Update Record",
  description:
    "Update fields on a SmartSuite record (PATCH /applications/{tableId}/records/{recordId}/).",
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
      hint: "The `id` of the record to update.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: "Object keyed by field slugs; only the supplied slugs are changed.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Updated record ID" },
  ],

  execute(input, ctx) {
    return new SmartSuiteClient(ctx).request(
      `applications/${encodeSegment(input.tableId)}/records/${encodeSegment(input.recordId)}/`,
      { method: "PATCH", body: input.fields },
    );
  },
};

export default updateRecord;
