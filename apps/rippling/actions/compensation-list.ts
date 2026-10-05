import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "compensation-list",
  resource: "compensation",
  title: "List Compensations",
  description:
    "Worker compensation records (sensitive: hidden unless the token owner may see it). Returns one page, forward-paginated.",
  path: "/compensations/",
  scope: "compensations.read",
  filterable: [],
  expandable: ["worker"],
  sortable: ["id", "created_at", "updated_at"],
});
