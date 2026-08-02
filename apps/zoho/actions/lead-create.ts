import type { ActionDefinition } from "@w6w/types";
import type { ZohoRecordResult } from "../lib/client.ts";
import { crmCreate } from "../lib/crm.ts";
import { dataFields, writeOutput } from "../lib/params.ts";

interface Input {
  fields: unknown;
}

const leadCreate: ActionDefinition<Input, ZohoRecordResult> = {
  key: "lead-create",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description:
    'Create a Lead. `Last_Name` and `Company` are Zoho\'s system-mandatory fields, e.g. { "Last_Name": "Smith", "Company": "Acme" }.',
  // Zoho mints a new id per call and offers no request key to dedupe on.
  idempotent: false,
  params: [dataFields],
  output: writeOutput,

  execute(input, ctx) {
    return crmCreate(ctx, "Leads", input);
  },
};

export default leadCreate;
