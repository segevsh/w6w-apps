import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "customer-updated",
  title: "Customer Updated",
  description:
    "Fires when a customer's properties change. The run gets the event and the Customer after the change, and previousAttributes holds the old values of what changed.",
  events: ["customer.updated"],
  sampleObject: {
    id: "cus_Oa1b2c",
    object: "customer",
    email: "jenny@example.com",
    name: "Jenny Rosen",
  },
});

export default trigger;
