import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-tag-updated",
  title: "Task Tag Updated",
  description:
    "Fires when a tag is added to or removed from a task in a ClickUp Workspace, Space, Folder or List. The run gets the task ID, list and the tag change.",
  events: ["taskTagUpdated"],
});
