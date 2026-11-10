import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-status-updated",
  title: "Task Status Updated",
  description:
    "Fires when a task's status changes in a ClickUp Workspace, Space, Folder or List. The run gets the task ID, list and the before/after status.",
  events: ["taskStatusUpdated"],
});
