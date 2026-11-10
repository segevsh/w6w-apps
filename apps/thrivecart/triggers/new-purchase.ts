import { webhookTrigger } from "../lib/triggers.ts";

/** A customer buys a product (event `order_payment_product`). */
const newPurchase = webhookTrigger({
  key: "new-purchase",
  title: "New Purchase",
  description:
    "Fires when a customer purchases a product in ThriveCart (event order_payment_product). Optional trigger fields narrow it to live or test mode or to chosen products. The run gets the event name, the delivery id, the event id and the full delivery as ThriveCart sent it.",
  event: "order_payment_product",
});

export default newPurchase;
