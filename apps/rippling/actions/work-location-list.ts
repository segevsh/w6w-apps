import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "work-location-list",
  resource: "work-location",
  title: "List Work Locations",
  description: "Office and other work locations. Returns one page, forward-paginated.",
  path: "/work-locations/",
  scope: "work-locations.read",
  filterable: [],
  expandable: [],
  sortable: ["id", "created_at", "updated_at"],
});
