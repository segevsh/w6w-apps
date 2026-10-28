import type { ActionDefinition } from "@w6w/types";
import type { BiginRecordResult } from "../lib/client.ts";
import { type DeleteInput, deleteRecord } from "../lib/records.ts";
import { recordId, writeOutput } from "../lib/params.ts";

const contactDelete: ActionDefinition<DeleteInput, BiginRecordResult> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description:
    "Delete a Contact from Bigin's Contacts module. Bigin moves the record to its Recycle Bin.",
  idempotent: true,
  params: [recordId],
  output: writeOutput,

  execute(input, ctx) {
    return deleteRecord(ctx, "Contacts", input);
  },
};

export default contactDelete;
