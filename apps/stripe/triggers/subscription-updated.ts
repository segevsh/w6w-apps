import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "subscription-updated",
  title: "Subscription Updated",
  description:
    "Fires when a subscription changes (plan, quantity, status, trial or renewal). The run gets the event and the Subscription after the change, and previousAttributes holds the old values.",
  events: ["customer.subscription.updated"],
  sampleObject: {
    id: "sub_1Nq0Za",
    object: "subscription",
    status: "active",
    customer: "cus_Oa1b2c",
  },
});

export default trigger;
