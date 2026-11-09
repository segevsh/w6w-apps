import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-updated",
  title: "Task Updated",
  description:
    "Fires when a ClickUp task is updated, including its status, assignee, due date, priority or move. The run gets the task ID, the event name and the before/after history.",
  // ClickUp sends `taskUpdated` for ANY task update and, in addition, one specific event
  // (status/assignee/due date/priority/move) for the same change. Registering for both runs the
  // flow twice per change, so only the generic event is registered and accepted.
  events: ["taskUpdated"],
});
