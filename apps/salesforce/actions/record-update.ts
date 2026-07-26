import type { ActionDefinition } from "@w6w/types";
import { fields, SalesforceClient, sobjectName } from "../lib/client.ts";
import { fieldsParam, recordId, sobject } from "../lib/params.ts";

interface Input {
  sobject: string;
  recordId: string;
  fields: unknown;
}

/**
 * Salesforce answers a successful PATCH with 204 and no body — read the record
 * back with `record-get` if you need the result.
 */
const recordUpdate: ActionDefinition<Input> = {
  key: "record-update",
  type: "perform",
  resource: "record",
  title: "Update Record",
  description:
    "Update a record's fields. Salesforce answers 204 with no body — use `record-get` to read it back.",
  // A PATCH writes absolute values, so replaying converges.
  idempotent: true,
  params: [
    sobject,
    recordId,
    { ...fieldsParam, hint: 'Only the fields to change, e.g. { "Status": "Working" }.' },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    return new SalesforceClient(ctx).request(
      `/sobjects/${sobjectName(input.sobject)}/${encodeURIComponent(input.recordId)}`,
      { method: "PATCH", body: fields(input.fields) },
    );
  },
};

export default recordUpdate;
