import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "user-get",
  resource: "user",
  title: "Get User",
  description: "Retrieve one user by id.",
  path: "/users",
  scope: "users.read",
  expandable: [],
});
