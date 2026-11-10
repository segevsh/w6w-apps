import tasksList from "../actions/tasks-list.ts";
import { newTaskTrigger } from "../lib/triggers.ts";

export default newTaskTrigger({
  key: "new-or-updated-task",
  title: "New or Updated Task",
  description:
    "The run gets each task newly created in the Linkup organisation or whose status or output changed.",
  action: tasksList as never,
  idLabel: "Task ID",
  updated: true,
});
