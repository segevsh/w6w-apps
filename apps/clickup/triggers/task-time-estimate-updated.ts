import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-time-estimate-updated",
  title: "Task Time Estimate Updated",
  description:
    "Fires when a task's time estimate is added or changed in a ClickUp Workspace, Space, Folder or List. The run gets the task ID, list and the before/after estimate.",
  events: ["taskTimeEstimateUpdated"],
});
