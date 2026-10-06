import { idFilters, nameFilter, timeFilters } from "../lib/filters.ts";
import { queryAction } from "../lib/query.ts";

export default queryAction({
  key: "landing-page-list",
  title: "List Landing Pages",
  description:
    "Query landing pages. Content fields (`content`, `scriptFragment`) are not queryable.",
  path: "landing-pages",
  resource: "landing-page",
  defaultFields: "id,name,title,url,vanityUrl,campaignId,formId,updatedAt",
  orderBy: ["id"],
  filters: [
    nameFilter("landing page"),
    ...idFilters,
    ...timeFilters("createdAt"),
    ...timeFilters("updatedAt"),
  ],
});
