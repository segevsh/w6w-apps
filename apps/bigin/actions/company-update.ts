import type { ActionDefinition } from "@w6w/types";
import type { BiginRecordResult } from "../lib/client.ts";
import { type UpdateInput, updateRecord } from "../lib/records.ts";
import { dataFields, recordId, writeOutput } from "../lib/params.ts";

const companyUpdate: ActionDefinition<UpdateInput, BiginRecordResult> = {
  key: "company-update",
  type: "perform",
  resource: "company",
  title: "Update Company",
  description: "Update a Company's fields in Bigin's Accounts module.",
  idempotent: true,
  params: [
    recordId,
    { ...dataFields, hint: 'Only the fields to change, e.g. { "Phone": "+1 555 0100" }.' },
  ],
  output: writeOutput,

  execute(input, ctx) {
    return updateRecord(ctx, "Accounts", input);
  },
};

export default companyUpdate;
