import type { ActionDefinition } from "@w6w/types";
import { ActiveCampaignClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
  automationId?: string;
  orderBy?: string;
  orderDirection?: string;
}

const listCampaigns: ActionDefinition<Input> = {
  key: "list-campaigns",
  type: "search",
  resource: "campaign",
  title: "List Campaigns",
  description: "List email campaigns, optionally filtered to those sent from one automation.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 20 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [
        { value: "sdate", label: "Send date" },
        { value: "ldate", label: "Last send date" },
      ],
      hint: "Optional. Leave empty to keep ActiveCampaign's default order.",
    },
    {
      key: "orderDirection",
      label: "Order direction",
      type: "select",
      options: [
        { value: "ASC", label: "Oldest first" },
        { value: "DESC", label: "Newest first" },
      ],
      default: "DESC",
      hint: "Used with Order by.",
    },
    {
      key: "automationId",
      label: "Automation ID",
      type: "string",
      hint: "Only campaigns sent from this automation's series.",
    },
  ],
  output: [
    { key: "campaigns", type: "array", label: "Campaigns" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  execute(input, ctx) {
    return new ActiveCampaignClient(ctx).request("/campaigns", {
      query: {
        limit: input.limit,
        offset: input.offset,
        "filters[seriesid]": input.automationId,
        ...(input.orderBy
          ? { [`orders[${input.orderBy}]`]: input.orderDirection === "ASC" ? "ASC" : "DESC" }
          : {}),
      },
    });
  },
};

export default listCampaigns;
