import { webhookTrigger } from "../lib/triggers.ts";

/** ThriveCart event `order_payment_upsell`. */
const newUpsellPurchase = webhookTrigger({
  key: "new-upsell-purchase",
  title: "New Upsell Purchase",
  description:
    "Fires when a customer buys an upsell in ThriveCart (event order_payment_upsell). Optional trigger fields narrow it to live or test mode or to chosen products. The run gets the event name, the delivery id, the event id and the full delivery as ThriveCart sent it.",
  event: "order_payment_upsell",
});

export default newUpsellPurchase;
