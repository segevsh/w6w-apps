import { webhookTrigger } from "../lib/triggers.ts";

/** A recurring payment succeeds (event `order_rebill`). */
const subscriptionPayment = webhookTrigger({
  key: "subscription-payment",
  title: "Subscription Payment",
  description:
    "Fires when a recurring ThriveCart payment succeeds (event order_rebill). The run gets the event name, the delivery id, the event id and the full delivery as ThriveCart sent it.",
  event: "order_rebill",
});

export default subscriptionPayment;
