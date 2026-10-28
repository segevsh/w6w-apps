import type { ActionDefinition } from "@w6w/types";
import type { ZohoRecordResult } from "../lib/client.ts";
import { crmUpdate } from "../lib/crm.ts";
import { dataFields, recordId, writeOutput } from "../lib/params.ts";

interface Input {
  recordId: string;
  fields: unknown;
}

const contactUpdate: ActionDefinition<Input, ZohoRecordResult> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a Contact's fields.",
  idempotent: true,
  params: [
    recordId,
    { ...dataFields, hint: 'Only the fields to change, e.g. { "Phone": "+1 555 0100" }.' },
  ],
  output: writeOutput,

  execute(input, ctx) {
    return crmUpdate(ctx, "Contacts", input);
  },
};

export default contactUpdate;
