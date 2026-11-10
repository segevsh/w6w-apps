import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "updated-person",
  title: "Person Updated",
  description:
    "The run gets the id of each Copper person that changes, with the fields that changed.",
  type: "person",
  event: "update",
  sample: {
    id: 123,
    type: "person",
    event: "update",
    subscriptionId: 17065,
    timestamp: "2026-11-09T12:00:00.000Z",
    updatedAttributes: { title: ["Engineer", "Staff Engineer"] },
  },
});
