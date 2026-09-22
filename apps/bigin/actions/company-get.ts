import type { ActionDefinition } from "@w6w/types";
import { type GetInput, getRecord } from "../lib/records.ts";
import { optionalFields, recordId } from "../lib/params.ts";

const companyGet: ActionDefinition<GetInput> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description: "Retrieve one Company record by id from Bigin's Accounts module.",
  params: [recordId, optionalFields],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "Owner", type: "object", label: "Record owner" },
  ],

  execute(input, ctx) {
    return getRecord(ctx, "Accounts", input);
  },
};

export default companyGet;
