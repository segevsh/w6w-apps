import { webhookTrigger } from "../lib/triggers.ts";

/** ThriveCart event `order_rebill_failed`. */
const subscriptionPaymentFailed = webhookTrigger({
  key: "subscription-payment-failed",
  title: "Subscription Payment Failed",
  description:
    "Fires when a recurring payment fails in ThriveCart (event order_rebill_failed). Optional trigger fields narrow it to live or test mode or to chosen products. The run gets the event name, the delivery id, the event id and the full delivery as ThriveCart sent it.",
  event: "order_rebill_failed",
});

export default subscriptionPaymentFailed;
