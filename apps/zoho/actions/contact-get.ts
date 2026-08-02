import type { ActionDefinition } from "@w6w/types";
import { crmGet, type CrmGetInput } from "../lib/crm.ts";
import { listFields, recordId } from "../lib/params.ts";

const DEFAULT_FIELDS = "id,First_Name,Last_Name,Email,Phone,Account_Name,Owner";

const contactGet: ActionDefinition<CrmGetInput> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Retrieve one Contact record by id.",
  params: [recordId, listFields(DEFAULT_FIELDS)],
  output: [{ key: "id", type: "string", label: "Record ID" }],

  execute(input, ctx) {
    return crmGet(ctx, "Contacts", input);
  },
};

export default contactGet;
