import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "customer-deleted",
  title: "Customer Deleted",
  description: "Fires when a customer is deleted. The run gets the id of the deleted customer.",
  topics: ["customers/delete"],
  sampleResource: { id: 706405506930370000 },
});

export default trigger;
