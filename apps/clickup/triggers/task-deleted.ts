import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-deleted",
  title: "Task Deleted",
  description:
    "Fires when a ClickUp task is deleted. The run gets the task ID and the list it was in.",
  events: ["taskDeleted"],
});
