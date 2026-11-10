import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "updated-lead",
  title: "Lead Updated",
  description:
    "The run gets the id of each Copper lead that changes, with the fields that changed.",
  type: "lead",
  event: "update",
  sample: {
    id: 123,
    type: "lead",
    event: "update",
    subscriptionId: 17065,
    timestamp: "2026-11-10T12:00:00.000Z",
    updatedAttributes: { status: ["New", "Contacted"] },
  },
});
