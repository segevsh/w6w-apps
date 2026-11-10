import { webhookTrigger } from "../lib/triggers.ts";

/** ThriveCart event `order_refund`. */
const orderRefunded = webhookTrigger({
  key: "order-refunded",
  title: "Order Refunded",
  description:
    "Fires when a refund is issued in ThriveCart (event order_refund). Optional trigger fields narrow it to live or test mode or to chosen products. The run gets the event name, the delivery id, the event id and the full delivery as ThriveCart sent it.",
  event: "order_refund",
});

export default orderRefunded;
