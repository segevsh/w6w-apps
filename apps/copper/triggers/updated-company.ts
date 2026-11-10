import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "updated-company",
  title: "Company Updated",
  description:
    "The run gets the id of each Copper company that changes, with the fields that changed.",
  type: "company",
  event: "update",
  sample: {
    id: 123,
    type: "company",
    event: "update",
    subscriptionId: 17065,
    timestamp: "2026-11-10T12:00:00.000Z",
    updatedAttributes: { name: ["Acme", "Acme Inc."] },
  },
});
