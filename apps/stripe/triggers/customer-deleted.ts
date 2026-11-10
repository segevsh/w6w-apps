import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "customer-deleted",
  title: "Customer Deleted",
  description: "Fires when a customer is deleted. The run gets the event and the deleted Customer.",
  events: ["customer.deleted"],
  sampleObject: { id: "cus_Oa1b2c", object: "customer", deleted: true },
});

export default trigger;
