import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient } from "../lib/client.ts";

interface Input {
  page?: number;
  limit?: number;
}

const costCenterList: ActionDefinition<Input> = {
  key: "cost-center-list",
  type: "read",
  resource: "cost-center",
  title: "List Cost Centers",
  description: "List cost centers.",
  params: [
    {
      "key": "page",
      "label": "Page",
      "type": "number",
      "hint": "Page number, starting at 1. Totals are in MetaInformation of the response.",
    },
    {
      "key": "limit",
      "label": "Limit",
      "type": "number",
      "hint": "Records per page: 1 to 500 (Fortnox default 100).",
    },
  ],
  output: [
    {
      "key": "CostCenters",
      "type": "array",
      "label": "Cost centers",
    },
    {
      "key": "MetaInformation",
      "type": "object",
      "label": "Paging totals (@TotalResources, @TotalPages, @CurrentPage)",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get("/3/costcenters", { page: input.page, limit: input.limit });
  },
};

export default costCenterList;
