import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "deleted-lead",
  title: "Lead Deleted",
  description: "The run gets the id of each lead deleted in Copper.",
  type: "lead",
  event: "delete",
  sample: {
    id: 123,
    type: "lead",
    event: "delete",
    subscriptionId: 17065,
    timestamp: "2026-11-10T12:00:00.000Z",
    updatedAttributes: null,
  },
});
