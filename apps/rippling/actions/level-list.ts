import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "level-list",
  resource: "level",
  title: "List Levels",
  description: "Job levels. Returns one page, forward-paginated.",
  path: "/levels/",
  scope: "levels.read",
  filterable: [],
  expandable: ["parent", "track"],
  sortable: ["id", "created_at", "updated_at"],
});
