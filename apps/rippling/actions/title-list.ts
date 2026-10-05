import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "title-list",
  resource: "title",
  title: "List Titles",
  description: "Job titles. Returns one page, forward-paginated.",
  path: "/titles/",
  scope: "titles.read",
  filterable: [],
  expandable: [],
  sortable: ["id", "created_at", "updated_at"],
});
