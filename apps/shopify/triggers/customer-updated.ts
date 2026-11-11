import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "customer-updated",
  title: "Customer Updated",
  description: "Fires when a customer changes. The run gets the customer as it is now.",
  topics: ["customers/update"],
  sampleResource: {
    id: 706405506930370000,
    email: "bob@example.com",
    first_name: "Bob",
    last_name: "Norman",
    updated_at: "2026-11-10T09:30:00-05:00",
  },
});

export default trigger;
