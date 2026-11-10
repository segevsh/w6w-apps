import { webhookTrigger } from "../lib/triggers.ts";

/** ThriveCart event `order_payment_bump`. */
const newBumpPurchase = webhookTrigger({
  key: "new-bump-purchase",
  title: "New Bump Purchase",
  description:
    "Fires when a customer buys an order-bump offer in ThriveCart (event order_payment_bump). Optional trigger fields narrow it to live or test mode or to chosen products. The run gets the event name, the delivery id, the event id and the full delivery as ThriveCart sent it.",
  event: "order_payment_bump",
});

export default newBumpPurchase;
