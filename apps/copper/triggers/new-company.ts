import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "new-company",
  title: "New Company",
  description: "The run gets the id of each company created in Copper.",
  type: "company",
  event: "new",
  sample: {
    id: 123,
    type: "company",
    event: "new",
    subscriptionId: 17065,
    timestamp: "2026-11-09T12:00:00.000Z",
    updatedAttributes: null,
  },
});
