import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "customer-created",
  title: "Customer Created",
  description:
    "Fires when a customer is created. The run gets the customer: name, email and addresses.",
  topics: ["customers/create"],
  sampleResource: {
    id: 706405506930370000,
    email: "bob@example.com",
    first_name: "Bob",
    last_name: "Norman",
  },
});

export default trigger;
