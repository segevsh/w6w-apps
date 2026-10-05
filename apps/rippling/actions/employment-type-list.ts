import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "employment-type-list",
  resource: "employment-type",
  title: "List Employment Types",
  description:
    "Employment types (employee or contractor, hourly or salaried, full- or part-time). Returns one page, forward-paginated.",
  path: "/employment-types/",
  scope: "employment-types.read",
  filterable: [],
  expandable: [],
  sortable: ["id", "created_at", "updated_at"],
});
