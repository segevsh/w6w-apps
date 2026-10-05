import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "leave-type-list",
  resource: "leave-type",
  title: "List Leave Types",
  description: "Time-off types (vacation, sick, ...). Returns one page, forward-paginated.",
  path: "/leave-types/",
  scope: "leave-types.read",
  filterable: ["name"],
  expandable: [],
  sortable: ["id", "created_at", "updated_at"],
});
