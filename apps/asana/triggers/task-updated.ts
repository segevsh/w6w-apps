import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-updated",
  title: "Task Updated",
  description:
    "Fires when a task in an Asana project changes. The run gets the task ID, the changed field and who changed it.",
  action: "changed",
});
