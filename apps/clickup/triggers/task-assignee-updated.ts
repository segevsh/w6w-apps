import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-assignee-updated",
  title: "Task Assignee Updated",
  description:
    "Fires when an assignee is added to or removed from a task in a ClickUp Workspace, Space, Folder or List. The run gets the task ID, list and the assignee change.",
  events: ["taskAssigneeUpdated"],
});
