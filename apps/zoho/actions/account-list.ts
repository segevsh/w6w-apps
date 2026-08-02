import type { ActionDefinition } from "@w6w/types";
import { crmList, type CrmListInput } from "../lib/crm.ts";
import { listFields, pageParams } from "../lib/params.ts";

const DEFAULT_FIELDS = "id,Account_Name,Phone,Website,Industry,Owner";

const accountList: ActionDefinition<CrmListInput> = {
  key: "account-list",
  type: "read",
  resource: "account",
  title: "List Accounts",
  description: "List records in the Accounts module.",
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
    { key: "data", type: "array", label: "Accounts" },
    { key: "info", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return crmList(ctx, "Accounts", input);
  },
};

export default accountList;
