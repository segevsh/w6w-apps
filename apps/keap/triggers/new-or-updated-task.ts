import taskList from "../actions/task-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each Keap task that is new or was edited (`GET /rest/v2/tasks`, `order_by=update_time desc`; completing a task is an edit). Brief 9.1 (a), 9.2. */
export default feedTrigger({
  key: "new-or-updated-task",
  title: "New or Updated Task",
  description:
    "The run gets each Keap task that is new or was edited (`GET /rest/v2/tasks`, `order_by=update_time desc`; completing a task is an edit).",
  action: taskList,
  list: "tasks",
  orderBy: "update_time desc",
  stamp: "modification_time",
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "modification_time", type: "string", label: "Modified at" },
    { key: "completion_time", type: "string", label: "Completed at" },
  ],
  sample: { id: "1", title: "Call back", modification_time: "2026-11-10T12:30:00.000Z" },
});
