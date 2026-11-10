import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "new-lead",
  title: "New Lead",
  description: "The run gets the id of each lead created in Copper.",
  type: "lead",
  event: "new",
  sample: {
    id: 123,
    type: "lead",
    event: "new",
    subscriptionId: 17065,
    timestamp: "2026-11-09T12:00:00.000Z",
    updatedAttributes: null,
  },
});
