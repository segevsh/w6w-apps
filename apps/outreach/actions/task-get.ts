import { getAction } from "../lib/factory.ts";
export default getAction({
  key: "task-get",
  title: "Get Task",
  noun: "Task",
  type: "task",
  path: "tasks",
  description: "Fetch one task by ID.",
});
