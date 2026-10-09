import { webhookTrigger } from "../lib/triggers.ts";

const orderRefunded = webhookTrigger({
  key: "order-refunded",
  title: "Order Refunded",
  description: "Fires when an order is refunded. The run gets the refunded order.",
  action: "order.refunded",
});

export default orderRefunded;
