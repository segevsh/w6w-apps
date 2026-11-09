import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "customer-created",
  title: "Customer Created",
  description:
    "Fires when a customer registers or is created. The run gets the customer: name, email and addresses.",
  topics: ["customer.created"],
  samplePayload: { id: 25, email: "john.doe@example.com", first_name: "John", last_name: "Doe" },
});

export default trigger;
