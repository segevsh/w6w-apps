import type { ActionDefinition } from "@w6w/types";
import type { BiginRecordResult } from "../lib/client.ts";
import { type UpdateInput, updateRecord } from "../lib/records.ts";
import { dataFields, recordId, writeOutput } from "../lib/params.ts";

const contactUpdate: ActionDefinition<UpdateInput, BiginRecordResult> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a Contact's fields in Bigin's Contacts module.",
  idempotent: true,
  params: [
    recordId,
    { ...dataFields, hint: 'Only the fields to change, e.g. { "Phone": "+1 555 0100" }.' },
  ],
  output: writeOutput,

  execute(input, ctx) {
    return updateRecord(ctx, "Contacts", input);
  },
};

export default contactUpdate;
