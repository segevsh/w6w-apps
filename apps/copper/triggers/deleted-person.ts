import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "deleted-person",
  title: "Person Deleted",
  description: "The run gets the id of each person deleted in Copper.",
  type: "person",
  event: "delete",
  sample: {
    id: 123,
    type: "person",
    event: "delete",
    subscriptionId: 17065,
    timestamp: "2026-11-10T12:00:00.000Z",
    updatedAttributes: null,
  },
});
