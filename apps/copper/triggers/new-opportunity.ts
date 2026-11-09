import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "new-opportunity",
  title: "New Opportunity",
  description: "The run gets the id of each opportunity created in Copper.",
  type: "opportunity",
  event: "new",
  sample: {
    id: 123,
    type: "opportunity",
    event: "new",
    subscriptionId: 17065,
    timestamp: "2026-11-09T12:00:00.000Z",
    updatedAttributes: null,
  },
});
