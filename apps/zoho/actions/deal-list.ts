import type { ActionDefinition } from "@w6w/types";
import { crmList, type CrmListInput } from "../lib/crm.ts";
import { listFields, pageParams } from "../lib/params.ts";

const DEFAULT_FIELDS = "id,Deal_Name,Amount,Stage,Closing_Date,Account_Name,Owner";

const dealList: ActionDefinition<CrmListInput> = {
  key: "deal-list",
  type: "read",
  resource: "deal",
  title: "List Deals",
  description: "List records in the Deals module.",
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
    { key: "data", type: "array", label: "Deals" },
    { key: "info", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return crmList(ctx, "Deals", input);
  },
};

export default dealList;
