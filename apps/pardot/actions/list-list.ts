import { idFilters, nameFilter, timeFilters } from "../lib/filters.ts";
import { queryAction } from "../lib/query.ts";

export default queryAction({
  key: "list-list",
  title: "List Lists",
  description: "Query Account Engagement lists (the static and dynamic prospect lists).",
  path: "lists",
  resource: "list",
  defaultFields: "id,name,title,description,isPublic,isDynamic,campaignId,updatedAt",
  orderBy: ["id", "createdAt", "updatedAt"],
  filters: [
    nameFilter("list"),
    ...idFilters,
    ...timeFilters("createdAt"),
    ...timeFilters("updatedAt"),
  ],
});
