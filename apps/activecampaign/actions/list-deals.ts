import type { ActionDefinition } from "@w6w/types";
import { ActiveCampaignClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
  search?: string;
  stage?: string;
  group?: string;
  status?: number;
}

const listDeals: ActionDefinition<Input> = {
  key: "list-deals",
  type: "search",
  resource: "deal",
  title: "List Deals",
  description: "List deals, optionally filtered by pipeline stage, pipeline or status.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 20 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    { key: "search", label: "Search", type: "string", hint: "Matches deal title." },
    { key: "stage", label: "Stage ID", type: "string" },
    { key: "group", label: "Pipeline (Group) ID", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "0", label: "Open" },
        { value: "1", label: "Won" },
        { value: "2", label: "Lost" },
      ],
    },
  ],
  output: [
    { key: "deals", type: "array", label: "Deals" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  execute(input, ctx) {
    return new ActiveCampaignClient(ctx).request("/deals", {
      query: {
        limit: input.limit,
        offset: input.offset,
        "filters[search]": input.search,
        "filters[stage]": input.stage,
        "filters[group]": input.group,
        "filters[status]": input.status,
      },
    });
  },
};

export default listDeals;
