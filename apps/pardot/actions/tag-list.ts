import { idFilters, nameFilter, timeFilters } from "../lib/filters.ts";
import { queryAction } from "../lib/query.ts";

export default queryAction({
  key: "tag-list",
  title: "List Tags",
  description: "Query tags, with how many records carry each.",
  path: "tags",
  resource: "tag",
  defaultFields: "id,name,objectCount,createdAt,updatedAt",
  orderBy: ["id", "createdAt", "updatedAt"],
  supportsDeleted: false,
  filters: [
    nameFilter("tag"),
    ...idFilters,
    ...timeFilters("createdAt"),
    ...timeFilters("updatedAt"),
  ],
});
