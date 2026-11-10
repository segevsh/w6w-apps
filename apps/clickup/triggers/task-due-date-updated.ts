import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-due-date-updated",
  title: "Task Due Date Updated",
  description:
    "Fires when a task's due date changes in a ClickUp Workspace, Space, Folder or List. The run gets the task ID, list and the before/after due date.",
  events: ["taskDueDateUpdated"],
});
