import type { ActionDefinition } from "@w6w/types";
import { type ListInput, listRecords } from "../lib/records.ts";
import { cursorParams, listFields, listOutput, pageParams, sortParams } from "../lib/params.ts";

const DEFAULT_FIELDS = "id,Account_Name,Phone,Website,Billing_City,Billing_Country,Owner";

const companyList: ActionDefinition<ListInput> = {
  key: "company-list",
  type: "read",
  resource: "company",
  title: "List Companies",
  description:
    "List records in Bigin's Accounts module. `fields` is required by the API (max 50 names).",
  params: [listFields(DEFAULT_FIELDS), ...pageParams, ...sortParams, ...cursorParams],
  output: listOutput,

  execute(input, ctx) {
    return listRecords(ctx, "Accounts", input);
  },
};

export default companyList;
