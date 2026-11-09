import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-updated",
  title: "Task Updated",
  description:
    "Fires when a ClickUp task is updated, including its status, assignee, due date, priority or move. The run gets the task ID, the event name and the before/after history.",
  events: [
    "taskUpdated",
    "taskStatusUpdated",
    "taskAssigneeUpdated",
    "taskDueDateUpdated",
    "taskPriorityUpdated",
    "taskMoved",
  ],
});
