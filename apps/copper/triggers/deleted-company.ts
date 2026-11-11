import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "deleted-company",
  title: "Company Deleted",
  description: "The run gets the id of each company deleted in Copper.",
  type: "company",
  event: "delete",
  sample: {
    id: 123,
    type: "company",
    event: "delete",
    subscriptionId: 17065,
    timestamp: "2026-11-10T12:00:00.000Z",
    updatedAttributes: null,
  },
});
