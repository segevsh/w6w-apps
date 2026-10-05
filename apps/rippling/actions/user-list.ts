import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "user-list",
  resource: "user",
  title: "List Users",
  description:
    "A user is an account that can sign in and be granted access and roles. Returns one page, forward-paginated.",
  path: "/users/",
  scope: "users.read",
  filterable: [],
  expandable: [],
  sortable: ["id", "created_at", "updated_at"],
});
