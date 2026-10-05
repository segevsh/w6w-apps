import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "department-list",
  resource: "department",
  title: "List Departments",
  description:
    "Departments of the company, optionally nested. Returns one page, forward-paginated.",
  path: "/departments/",
  scope: "departments.read",
  filterable: [],
  expandable: ["parent", "department_hierarchy"],
  sortable: ["id", "created_at", "updated_at"],
});
