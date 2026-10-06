import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient } from "../lib/client.ts";

interface Input {
  date?: string;
}

const financialYearList: ActionDefinition<Input> = {
  key: "financial-year-list",
  type: "search",
  resource: "financial-year",
  title: "List Financial Years",
  description: "List the company's financial years; filter to the one containing a date.",
  params: [
    {
      "key": "date",
      "label": "Date",
      "type": "string",
      "hint":
        "Only the financial year containing this date (YYYY-MM-DD). The reference spells this parameter with a capital D.",
    },
  ],
  output: [
    {
      "key": "FinancialYears",
      "type": "array",
      "label": "Financial years",
    },
    {
      "key": "MetaInformation",
      "type": "object",
      "label": "Paging totals (@TotalResources, @TotalPages, @CurrentPage)",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get("/3/financialyears", { Date: input.date });
  },
};

export default financialYearList;
