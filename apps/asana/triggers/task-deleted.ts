import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-deleted",
  title: "Task Deleted",
  description:
    "Fires when a task in an Asana project is deleted. The run gets the task ID, who deleted it and when.",
  action: "deleted",
});
