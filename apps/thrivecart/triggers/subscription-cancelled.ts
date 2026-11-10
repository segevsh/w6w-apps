import { webhookTrigger } from "../lib/triggers.ts";

/** A subscription is cancelled (event `order_rebill_cancelled`). */
const subscriptionCancelled = webhookTrigger({
  key: "subscription-cancelled",
  title: "Subscription Cancelled",
  description:
    "Fires when a ThriveCart subscription is cancelled (event order_rebill_cancelled). The run gets the event name, the delivery id, the event id and the full delivery as ThriveCart sent it.",
  event: "order_rebill_cancelled",
});

export default subscriptionCancelled;
