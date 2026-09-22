import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, SmartSuiteClient } from "../lib/client.ts";

interface Input {
  tableId: string;
  recordId: string;
}

/**
 * `GET /applications/{tableId}/records/{recordId}/` — one record.
 *
 * Ids in the response are SmartSuite's own URL-safe ids (the same value a
 * workflow would use in the SmartSuite UI link, rather than the internal
 * numeric row id).
 */
const getRecord: ActionDefinition<Input> = {
  key: "get-record",
  type: "read",
  resource: "record",
  title: "Get Record",
  description:
    "Retrieve a single record from a SmartSuite Table (GET /applications/{tableId}/records/{recordId}/).",
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
      hint: "The `id` of the record, as returned by List Records.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "title", type: "string", label: "Record title" },
  ],

  execute(input, ctx) {
    return new SmartSuiteClient(ctx).request(
      `applications/${encodeSegment(input.tableId)}/records/${encodeSegment(input.recordId)}/`,
    );
  },
};

export default getRecord;
