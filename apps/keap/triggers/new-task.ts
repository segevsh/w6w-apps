import taskList from "../actions/task-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each new Keap task, newest first (`GET /rest/v2/tasks`, `order_by=create_time desc`). Brief 9.1 (a). */
export default feedTrigger({
  key: "new-task",
  title: "New Task",
  description:
    "The run gets each new Keap task, newest first (`GET /rest/v2/tasks`, `order_by=create_time desc`).",
  action: taskList,
  list: "tasks",
  orderBy: "create_time desc",
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "create_time", type: "string", label: "Created at" },
    { key: "due_time", type: "string", label: "Due at" },
  ],
  sample: {
    id: "1",
    title: "Call back",
    create_time: "2026-11-10T12:00:00.000Z",
    due_time: "2026-11-11T12:00:00.000Z",
  },
});
