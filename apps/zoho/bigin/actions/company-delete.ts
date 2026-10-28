import type { ActionDefinition } from "@w6w/types";
import type { BiginRecordResult } from "../lib/client.ts";
import { type DeleteInput, deleteRecord } from "../lib/records.ts";
import { recordId, writeOutput } from "../lib/params.ts";

const companyDelete: ActionDefinition<DeleteInput, BiginRecordResult> = {
  key: "company-delete",
  type: "perform",
  resource: "company",
  title: "Delete Company",
  description:
    "Delete a Company from Bigin's Accounts module. Bigin moves the record to its Recycle Bin.",
  idempotent: true,
  params: [recordId],
  output: writeOutput,

  execute(input, ctx) {
    return deleteRecord(ctx, "Accounts", input);
  },
};

export default companyDelete;
