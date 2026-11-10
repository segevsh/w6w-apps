import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "customer-updated",
  title: "Customer Updated",
  description:
    "Fires when a customer's details change. The run gets the customer as it is now: name, email and addresses.",
  topics: ["customer.updated"],
  samplePayload: { id: 25, email: "john.doe@example.com", first_name: "John", last_name: "Doe" },
});

export default trigger;
