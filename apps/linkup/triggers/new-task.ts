import tasksList from "../actions/tasks-list.ts";
import { newTaskTrigger } from "../lib/triggers.ts";

export default newTaskTrigger({
  key: "new-task",
  title: "New Task",
  description: "The run gets each task newly created in the Linkup organisation.",
  action: tasksList as never,
  idLabel: "Task ID",
});
