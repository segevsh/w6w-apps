import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-comment-updated",
  title: "Task Comment Updated",
  description:
    "Fires when an existing comment on a task is edited in a ClickUp Workspace, Space, Folder or List. The run gets the task ID and the edited comment in the history items.",
  events: ["taskCommentUpdated"],
});
