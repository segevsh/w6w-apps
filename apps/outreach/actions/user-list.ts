import { listAction } from "../lib/factory.ts";
export default listAction({
  key: "user-list",
  title: "List Users",
  noun: "User",
  type: "user",
  path: "users",
  description: "List Outreach users, e.g. to look up the owner ID to assign a prospect to.",
});
