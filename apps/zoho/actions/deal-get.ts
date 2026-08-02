import type { ActionDefinition } from "@w6w/types";
import { crmGet, type CrmGetInput } from "../lib/crm.ts";
import { listFields, recordId } from "../lib/params.ts";

const DEFAULT_FIELDS = "id,Deal_Name,Amount,Stage,Closing_Date,Account_Name,Owner";

const dealGet: ActionDefinition<CrmGetInput> = {
  key: "deal-get",
  type: "read",
  resource: "deal",
  title: "Get Deal",
  description: "Retrieve one Deal record by id.",
  params: [recordId, listFields(DEFAULT_FIELDS)],
  output: [{ key: "id", type: "string", label: "Record ID" }],

  execute(input, ctx) {
    return crmGet(ctx, "Deals", input);
  },
};

export default dealGet;
