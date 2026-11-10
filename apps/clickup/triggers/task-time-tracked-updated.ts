import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-time-tracked-updated",
  title: "Task Time Tracked Updated",
  description:
    "Fires when time tracked on a task is added, changed or deleted in a ClickUp Workspace, Space, Folder or List. The run gets the task ID, list and the time-entry history.",
  events: ["taskTimeTrackedUpdated"],
});
