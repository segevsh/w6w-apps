import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "deleted-opportunity",
  title: "Opportunity Deleted",
  description: "The run gets the id of each opportunity deleted in Copper.",
  type: "opportunity",
  event: "delete",
  sample: {
    id: 123,
    type: "opportunity",
    event: "delete",
    subscriptionId: 17065,
    timestamp: "2026-11-10T12:00:00.000Z",
    updatedAttributes: null,
  },
});
