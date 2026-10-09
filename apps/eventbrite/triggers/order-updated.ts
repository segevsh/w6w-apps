import { webhookTrigger } from "../lib/triggers.ts";

const orderUpdated = webhookTrigger({
  key: "order-updated",
  title: "Order Updated",
  description: "Fires when an order's details change. The run gets the order as it is now.",
  action: "order.updated",
});

export default orderUpdated;
