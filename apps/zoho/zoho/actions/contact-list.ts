import type { ActionDefinition } from "@w6w/types";
import { crmList, type CrmListInput } from "../lib/crm.ts";
import { listFields, pageParams } from "../lib/params.ts";

const DEFAULT_FIELDS = "id,First_Name,Last_Name,Email,Phone,Account_Name,Owner";

const contactList: ActionDefinition<CrmListInput> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List records in the Contacts module.",
  params: [
    listFields(DEFAULT_FIELDS),
    ...pageParams,
    { key: "sort_by", label: "Sort by", type: "string", default: "Created_Time" },
    {
      key: "sort_order",
      label: "Sort order",
      type: "select",
      default: "desc",
      options: [
        { value: "desc", label: "Descending" },
        { value: "asc", label: "Ascending" },
      ],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Contacts" },
    { key: "info", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return crmList(ctx, "Contacts", input);
  },
};

export default contactList;
