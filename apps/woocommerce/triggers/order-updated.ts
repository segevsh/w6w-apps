import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "order-updated",
  title: "Order Updated",
  description:
    "Fires when an order changes, such as its status. The run gets the order as it is now.",
  topics: ["order.updated"],
  samplePayload: { id: 727, status: "completed", total: "29.99", currency: "USD" },
});

export default trigger;
