import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "department-get",
  resource: "department",
  title: "Get Department",
  description: "Retrieve one department by id.",
  path: "/departments",
  scope: "departments.read",
  expandable: ["parent", "department_hierarchy"],
});
