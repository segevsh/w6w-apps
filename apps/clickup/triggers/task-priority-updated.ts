import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-priority-updated",
  title: "Task Priority Updated",
  description:
    "Fires when a task's priority changes in a ClickUp Workspace, Space, Folder or List. The run gets the task ID, list and the before/after priority.",
  events: ["taskPriorityUpdated"],
});
