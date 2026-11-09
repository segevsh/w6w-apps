import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "subscription-canceled",
  title: "Subscription Canceled",
  description: "Fires when a subscription ends. The run gets the event and the final Subscription.",
  events: ["customer.subscription.deleted"],
  sampleObject: {
    id: "sub_1Nq0Zf",
    object: "subscription",
    customer: "cus_Oa1b2c",
    status: "canceled",
  },
});

export default trigger;
