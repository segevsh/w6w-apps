import type { ActionDefinition } from "@w6w/types";
import { fields, SalesforceClient, sobjectName } from "../lib/client.ts";
import { fieldsParam, sobject } from "../lib/params.ts";

interface Input {
  sobject: string;
  externalIdField: string;
  externalId: string;
  fields: unknown;
}

/**
 * The retry-safe write. Keyed on an External ID field, Salesforce creates the
 * record if the key is new and updates it if not — so replaying an invocation
 * lands on one record rather than two.
 */
const recordUpsert: ActionDefinition<Input> = {
  key: "record-upsert",
  type: "perform",
  resource: "record",
  title: "Upsert Record",
  description:
    "Create or update a record keyed on an External ID field. The retry-safe alternative to `record-create`.",
  idempotent: true,
  params: [
    sobject,
    {
      key: "externalIdField",
      label: "External ID field",
      type: "string",
      required: true,
      row: "key",
      placeholder: "Legacy_Id__c",
      hint: "A field marked External ID on the object. Salesforce rejects any other field here.",
    },
    {
      key: "externalId",
      label: "External ID value",
      type: "string",
      required: true,
      row: "key",
      hint: "The value that identifies this record in your own system.",
    },
    {
      ...fieldsParam,
      hint: "Fields to write. Do NOT include the external id field itself — it is in the URL.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "success", type: "boolean", label: "Succeeded" },
    { key: "created", type: "boolean", label: "True if it was created rather than updated" },
  ],

  execute(input, ctx) {
    return new SalesforceClient(ctx).request(
      `/sobjects/${sobjectName(input.sobject)}/${sobjectName(input.externalIdField)}/${
        encodeURIComponent(input.externalId)
      }`,
      { method: "PATCH", body: fields(input.fields) },
    );
  },
};

export default recordUpsert;
