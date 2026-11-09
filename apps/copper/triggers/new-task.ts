import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "new-task",
  title: "New Task",
  description: "The run gets the id of each task created in Copper.",
  type: "task",
  event: "new",
  sample: {
    id: 123,
    type: "task",
    event: "new",
    subscriptionId: 17065,
    timestamp: "2026-11-09T12:00:00.000Z",
    updatedAttributes: null,
  },
});
