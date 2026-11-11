import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "updated-task",
  title: "Task Updated",
  description:
    "The run gets the id of each Copper task that changes, with the fields that changed.",
  type: "task",
  event: "update",
  sample: {
    id: 123,
    type: "task",
    event: "update",
    subscriptionId: 17065,
    timestamp: "2026-11-10T12:00:00.000Z",
    updatedAttributes: { status: ["Open", "Completed"] },
  },
});
