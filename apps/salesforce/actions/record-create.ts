import type { ActionDefinition } from "@w6w/types";
import { fields, SalesforceClient, sobjectName } from "../lib/client.ts";
import { fieldsParam, sobject, writeOutput } from "../lib/params.ts";

interface Input {
  sobject: string;
  fields: unknown;
}

const recordCreate: ActionDefinition<Input> = {
  key: "record-create",
  type: "perform",
  resource: "record",
  title: "Create Record",
  description:
    "Create a record of any object — Lead, Account, Contact, Opportunity, Case or a custom object.",
  // Salesforce mints a new id per call and offers no request key. Use
  // `record-upsert` with an external id when a retry must converge.
  idempotent: false,
  params: [sobject, fieldsParam],
  output: writeOutput,

  execute(input, ctx) {
    return new SalesforceClient(ctx).request(`/sobjects/${sobjectName(input.sobject)}`, {
      method: "POST",
      body: fields(input.fields),
    });
  },
};

export default recordCreate;
