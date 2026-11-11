import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "deleted-task",
  title: "Task Deleted",
  description: "The run gets the id of each task deleted in Copper.",
  type: "task",
  event: "delete",
  sample: {
    id: 123,
    type: "task",
    event: "delete",
    subscriptionId: 17065,
    timestamp: "2026-11-10T12:00:00.000Z",
    updatedAttributes: null,
  },
});
