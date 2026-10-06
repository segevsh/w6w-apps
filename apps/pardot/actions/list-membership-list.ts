import { idFilters, timeFilters } from "../lib/filters.ts";
import { queryAction } from "../lib/query.ts";

export default queryAction({
  key: "list-membership-list",
  title: "List List Memberships",
  description:
    "Query which prospects are on which lists. Filter by list or by prospect to answer either direction.",
  path: "list-memberships",
  resource: "list-membership",
  defaultFields: "id,listId,prospectId,optedOut,createdAt,updatedAt",
  orderBy: ["id", "createdAt", "updatedAt", "listId"],
  filters: [
    { key: "listId", label: "List ID", type: "number", hint: "Memberships on this list." },
    { key: "prospectId", label: "Prospect ID", type: "number", hint: "Lists this prospect is on." },
    ...idFilters,
    ...timeFilters("createdAt"),
    ...timeFilters("updatedAt"),
  ],
});
