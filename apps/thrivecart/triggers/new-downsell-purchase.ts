import { webhookTrigger } from "../lib/triggers.ts";

/** ThriveCart event `order_payment_downsell`. */
const newDownsellPurchase = webhookTrigger({
  key: "new-downsell-purchase",
  title: "New Downsell Purchase",
  description:
    "Fires when a customer buys a downsell in ThriveCart (event order_payment_downsell). Optional trigger fields narrow it to live or test mode or to chosen products. The run gets the event name, the delivery id, the event id and the full delivery as ThriveCart sent it.",
  event: "order_payment_downsell",
});

export default newDownsellPurchase;
