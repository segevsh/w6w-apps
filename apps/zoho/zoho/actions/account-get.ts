import type { ActionDefinition } from "@w6w/types";
import { crmGet, type CrmGetInput } from "../lib/crm.ts";
import { listFields, recordId } from "../lib/params.ts";

const DEFAULT_FIELDS = "id,Account_Name,Phone,Website,Industry,Owner";

const accountGet: ActionDefinition<CrmGetInput> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Retrieve one Account record by id.",
  params: [recordId, listFields(DEFAULT_FIELDS)],
  output: [{ key: "id", type: "string", label: "Record ID" }],

  execute(input, ctx) {
    return crmGet(ctx, "Accounts", input);
  },
};

export default accountGet;
