import { webhookTrigger } from "../lib/triggers.ts";

/** Todoist event `item:completed`. */
const trigger = webhookTrigger({
  key: "task-completed",
  title: "Task Completed",
  description:
    "Fires when a task is completed in Todoist. The run gets the event name, user, time and the task object.",
  eventName: "item:completed",
  sample: {
    eventName: "item:completed",
    userId: "2671355",
    triggeredAt: "2026-11-09T10:15:00.000000Z",
    deliveryId: "d4f1c2b0-9a3e-4d6f-8b1c-0a1b2c3d4e5f",
    itemId: "6012587408",
    data: { id: "6012587408", content: "Buy milk", project_id: "2203306141", checked: true },
  },
});

export default trigger;
