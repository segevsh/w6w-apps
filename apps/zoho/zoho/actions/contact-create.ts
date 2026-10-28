import type { ActionDefinition } from "@w6w/types";
import type { ZohoRecordResult } from "../lib/client.ts";
import { crmCreate } from "../lib/crm.ts";
import { dataFields, writeOutput } from "../lib/params.ts";

interface Input {
  fields: unknown;
}

const contactCreate: ActionDefinition<Input, ZohoRecordResult> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    'Create a Contact. `Last_Name` is Zoho\'s system-mandatory field, e.g. { "Last_Name": "Smith", "Email": "a@acme.com" }.',
  idempotent: false,
  params: [dataFields],
  output: writeOutput,

  execute(input, ctx) {
    return crmCreate(ctx, "Contacts", input);
  },
};

export default contactCreate;
