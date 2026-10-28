import type { ActionDefinition } from "@w6w/types";
import { crmList, type CrmListInput } from "../lib/crm.ts";
import { listFields, pageParams } from "../lib/params.ts";

const DEFAULT_FIELDS = "id,First_Name,Last_Name,Email,Company,Lead_Status,Owner";

const leadList: ActionDefinition<CrmListInput> = {
  key: "lead-list",
  type: "read",
  resource: "lead",
  title: "List Leads",
  description: "List records in the Leads module.",
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
    {
      key: "converted",
      label: "Converted",
      type: "select",
      default: "false",
      options: [
        { value: "false", label: "Not converted" },
        { value: "true", label: "Converted" },
        { value: "both", label: "Both" },
      ],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Leads" },
    { key: "info", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return crmList(ctx, "Leads", input);
  },
};

export default leadList;
