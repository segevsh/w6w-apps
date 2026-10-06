import { idFilters, nameFilter } from "../lib/filters.ts";
import { queryAction } from "../lib/query.ts";

export default queryAction({
  key: "form-list",
  title: "List Forms",
  description: "Query Account Engagement forms, with their embed code and URL.",
  path: "forms",
  resource: "form",
  defaultFields: "id,name,campaignId,url,embedCode,isDeleted,updatedAt",
  orderBy: ["id"],
  filters: [nameFilter("form"), ...idFilters],
});
