import { webhookTrigger } from "../lib/triggers.ts";

/** ThriveCart event `order_payment_declined_product`. */
const paymentDeclined = webhookTrigger({
  key: "payment-declined",
  title: "Payment Declined",
  description:
    "Fires when a product purchase is declined in ThriveCart (event order_payment_declined_product). Optional trigger fields narrow it to live or test mode or to chosen products. The run gets the event name, the delivery id, the event id and the full delivery as ThriveCart sent it.",
  event: "order_payment_declined_product",
});

export default paymentDeclined;
