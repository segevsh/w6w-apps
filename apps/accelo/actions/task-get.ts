import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "task-get",
  resource: "task",
  path: "/tasks",
  idKey: "taskId",
  idLabel: "Task ID",
  title: "Get Task",
  description: "Fetch one task by id.",
});
