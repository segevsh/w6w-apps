import { idFilters, nameFilter, timeFilters } from "../lib/filters.ts";
import { queryAction } from "../lib/query.ts";

export default queryAction({
  key: "form-handler-list",
  title: "List Form Handlers",
  description:
    "Query form handlers — the endpoints that let a form on your own site feed Account Engagement.",
  path: "form-handlers",
  resource: "form-handler",
  defaultFields: "id,name,campaignId,successLocation,errorLocation,embedCode,updatedAt",
  orderBy: ["id", "createdAt"],
  filters: [nameFilter("form handler"), ...idFilters, ...timeFilters("createdAt")],
});
