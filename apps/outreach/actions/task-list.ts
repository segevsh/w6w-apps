import { listAction } from "../lib/factory.ts";
export default listAction({
  key: "task-list",
  title: "List Tasks",
  noun: "Task",
  type: "task",
  path: "tasks",
  description:
    'List tasks. For a rep\'s open work filter `{"state": "incomplete", "owner": {"id": "1"}}` and include `prospect`.',
});
