import { webhookTrigger } from "../lib/triggers.ts";

/** Todoist event `item:added`. */
const trigger = webhookTrigger({
  key: "task-added",
  title: "Task Added",
  description:
    "Fires when a task is added in Todoist. The run gets the event name, user, time and the task object.",
  eventName: "item:added",
  sample: {
    eventName: "item:added",
    userId: "2671355",
    triggeredAt: "2026-11-09T10:15:00.000000Z",
    deliveryId: "d4f1c2b0-9a3e-4d6f-8b1c-0a1b2c3d4e5f",
    itemId: "6012587408",
    data: { id: "6012587408", content: "Buy milk", project_id: "2203306141", checked: false },
  },
});

export default trigger;
