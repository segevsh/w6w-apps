import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "task-list",
  resource: "task",
  path: "/tasks",
  title: "List Tasks",
  description: "List tasks across the deployment.",
});
