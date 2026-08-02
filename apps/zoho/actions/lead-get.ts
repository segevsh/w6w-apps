import type { ActionDefinition } from "@w6w/types";
import { crmGet, type CrmGetInput } from "../lib/crm.ts";
import { listFields, recordId } from "../lib/params.ts";

const DEFAULT_FIELDS = "id,First_Name,Last_Name,Email,Phone,Company,Lead_Status,Owner";

const leadGet: ActionDefinition<CrmGetInput> = {
  key: "lead-get",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description: "Retrieve one Lead record by id.",
  params: [recordId, listFields(DEFAULT_FIELDS)],
  output: [{ key: "id", type: "string", label: "Record ID" }],

  execute(input, ctx) {
    return crmGet(ctx, "Leads", input);
  },
};

export default leadGet;
