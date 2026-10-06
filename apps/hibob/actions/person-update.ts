import type { ActionDefinition } from "@w6w/types";
import { encodeId, HibobClient } from "../lib/client.ts";
import { employeeIdParam, toObject } from "../lib/params.ts";

interface Input {
  employeeId: string;
  fields: unknown;
}

/**
 * `PUT /v1/people/{identifier}` — update specific fields. The body mirrors the
 * NESTED shape People Search returns, not dotted ids:
 * `{ "firstName": "Jacky", "home": { "mobilePhone": "63635356" } }`.
 * Edit permission on each field's category is required, and a field the service
 * user may not edit is dropped without a warning — read it back to confirm.
 * Reads can lag a write by up to ~20 seconds.
 */
const personUpdate: ActionDefinition<Input> = {
  key: "person-update",
  type: "perform",
  idempotent: true,
  resource: "employee",
  title: "Update Employee",
  description: "Update fields on an employee record.",
  params: [
    employeeIdParam,
    {
      key: "fields",
      label: "Fields to update",
      type: "json",
      required: true,
      hint: 'Nested object copied from a People Search response, e.g. {"work":{"title":"Lead"},' +
        '"personal":{"birthDate":"2002-01-01"}}.',
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const fields = toObject(input.fields, "fields");
    if (Object.keys(fields).length === 0) throw new Error("fields must not be empty");
    return await new HibobClient(ctx).ack("PUT", `/people/${encodeId(input.employeeId)}`, {
      body: fields,
    });
  },
};

export default personUpdate;
