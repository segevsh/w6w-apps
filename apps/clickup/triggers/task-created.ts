import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-created",
  title: "Task Created",
  description:
    "Fires when a task is created in a ClickUp Workspace, Space, Folder or List. The run gets the task ID, its list and the creation history.",
  events: ["taskCreated"],
});
