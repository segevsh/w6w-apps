import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "team-list",
  resource: "team",
  title: "List Teams",
  description: "Teams of the company, optionally nested. Returns one page, forward-paginated.",
  path: "/teams/",
  scope: "teams.read",
  filterable: [],
  expandable: ["parent"],
  sortable: ["id", "created_at", "updated_at"],
});
