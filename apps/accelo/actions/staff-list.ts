import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "staff-list",
  resource: "staff",
  path: "/staff",
  title: "List Staff",
  description: "List staff members on the deployment.",
});
