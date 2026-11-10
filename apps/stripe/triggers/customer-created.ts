import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "customer-created",
  title: "Customer Created",
  description:
    "Fires when a customer is created. The run gets the event and the Customer: email, name and metadata.",
  events: ["customer.created"],
  sampleObject: {
    id: "cus_Oa1b2c",
    object: "customer",
    email: "jenny@example.com",
    name: "Jenny Rosen",
  },
});

export default trigger;
