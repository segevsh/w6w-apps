import type { ActionDefinition } from "@w6w/types";
import type { BiginRecordResult } from "../lib/client.ts";
import { type CreateInput, createRecord } from "../lib/records.ts";
import { dataFields, writeOutput } from "../lib/params.ts";

const contactCreate: ActionDefinition<CreateInput, BiginRecordResult> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    'Create a Contact in Bigin\'s Contacts module. `Last_Name` is Bigin\'s system-mandatory field, e.g. { "Last_Name": "Smith", "Email": "a@acme.com" }.',
  idempotent: false,
  params: [dataFields],
  output: writeOutput,

  execute(input, ctx) {
    return createRecord(ctx, "Contacts", input);
  },
};

export default contactCreate;
