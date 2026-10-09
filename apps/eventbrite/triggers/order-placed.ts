import { webhookTrigger } from "../lib/triggers.ts";

const orderPlaced = webhookTrigger({
  key: "order-placed",
  title: "New Order",
  description:
    "Fires when someone places an order for an event. The run gets the order: buyer name and email, status and totals.",
  action: "order.placed",
});

export default orderPlaced;
