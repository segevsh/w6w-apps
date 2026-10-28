import type { ActionDefinition } from "@w6w/types";
import type { ZohoRecordResult } from "../lib/client.ts";
import { crmDelete } from "../lib/crm.ts";
import { recordId, writeOutput } from "../lib/params.ts";

interface Input {
  recordId: string;
}

const contactDelete: ActionDefinition<Input, ZohoRecordResult> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a Contact record. Zoho moves it to Recycle Bin, recoverable for 30 days.",
  idempotent: true,
  params: [recordId],
  output: writeOutput,

  execute(input, ctx) {
    return crmDelete(ctx, "Contacts", input);
  },
};

export default contactDelete;
