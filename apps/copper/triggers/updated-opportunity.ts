import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "updated-opportunity",
  title: "Opportunity Updated",
  description:
    "The run gets the id of each Copper opportunity that changes, with the fields that changed.",
  type: "opportunity",
  event: "update",
  sample: {
    id: 123,
    type: "opportunity",
    event: "update",
    subscriptionId: 17065,
    timestamp: "2026-11-09T12:00:00.000Z",
    updatedAttributes: { status: ["Open", "Won"] },
  },
});
