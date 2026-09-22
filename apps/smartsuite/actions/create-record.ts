import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, SmartSuiteClient } from "../lib/client.ts";

interface Input {
  tableId: string;
  fields: Record<string, unknown>;
}

/**
 * `POST /applications/{tableId}/records/` — create one record.
 *
 * **The record object IS the request body.** Unlike Airtable, SmartSuite does
 * not wrap it under a `fields` key: `{ "field_slug": value, … }` goes on the
 * wire directly. The `fields` param is the w6w-side name for that object (the
 * same shape `create-record` uses in `apps/airtable`), and `execute` unwraps
 * it straight into the body.
 *
 * Values are keyed by **this table's own field slugs and are typed by this
 * table's own field definitions**, so the object is accepted as opaque JSON —
 * a linked-record field, a status field and a formula-driven field have
 * nothing in common at the wire level. Call `get-table` first when the slugs
 * are not already known.
 *
 * A missing required field is answered with `422` and a detailed body; that
 * error is surfaced as-is rather than pre-validated here, so the caller sees
 * exactly which slug SmartSuite objected to.
 *
 * `idempotent: false` — a retry can create a duplicate record.
 */
const createRecord: ActionDefinition<Input> = {
  key: "create-record",
  type: "perform",
  resource: "record",
  title: "Create Record",
  description: "Create one record in a SmartSuite Table (POST /applications/{tableId}/records/).",
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
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: "Object keyed by this table's field slugs. Sent as the raw request body, not nested.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Created record ID" },
  ],

  execute(input, ctx) {
    return new SmartSuiteClient(ctx).request(
      `applications/${encodeSegment(input.tableId)}/records/`,
      { method: "POST", body: input.fields },
    );
  },
};

export default createRecord;
