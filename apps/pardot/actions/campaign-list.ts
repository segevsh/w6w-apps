import { idFilters, nameFilter, timeFilters } from "../lib/filters.ts";
import { queryAction } from "../lib/query.ts";

export default queryAction({
  key: "campaign-list",
  title: "List Campaigns",
  description:
    "Query campaigns. Their ids are what prospects, forms and lists reference through `campaignId`.",
  path: "campaigns",
  resource: "campaign",
  defaultFields: "id,name,cost,parentCampaignId,salesforceId,updatedAt",
  orderBy: ["id", "createdAt", "updatedAt"],
  filters: [
    nameFilter("campaign"),
    ...idFilters,
    ...timeFilters("createdAt"),
    ...timeFilters("updatedAt"),
  ],
});
