import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-moved",
  title: "Task Moved",
  description:
    "Fires when a task is moved to a new List in a ClickUp Workspace, Space, Folder or List. The run gets the task ID, the new list and the move history.",
  events: ["taskMoved"],
});
