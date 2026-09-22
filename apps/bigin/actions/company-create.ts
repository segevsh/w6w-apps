import type { ActionDefinition } from "@w6w/types";
import type { BiginRecordResult } from "../lib/client.ts";
import { type CreateInput, createRecord } from "../lib/records.ts";
import { dataFields, writeOutput } from "../lib/params.ts";

const companyCreate: ActionDefinition<CreateInput, BiginRecordResult> = {
  key: "company-create",
  type: "perform",
  resource: "company",
  title: "Create Company",
  description:
    "Create a Company in Bigin's Accounts module. `Account_Name` is mandatory. A Company lives in Bigin's `Accounts` module, which is why this action posts to `/Accounts`.",
  idempotent: false,
  params: [dataFields],
  output: writeOutput,

  execute(input, ctx) {
    return createRecord(ctx, "Accounts", input);
  },
};

export default companyCreate;
