import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "new-task",
  title: "New Task",
  description:
    "Fires when a task is added to an Asana project. The run gets the task ID, who added it and when.",
  action: "added",
});
