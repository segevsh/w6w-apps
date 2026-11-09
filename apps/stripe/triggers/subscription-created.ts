import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "subscription-created",
  title: "Subscription Created",
  description:
    "Fires when a customer subscribes. The run gets the event and the Subscription: customer, status and items.",
  events: ["customer.subscription.created"],
  sampleObject: {
    id: "sub_1Nq0Zf",
    object: "subscription",
    customer: "cus_Oa1b2c",
    status: "active",
  },
});

export default trigger;
