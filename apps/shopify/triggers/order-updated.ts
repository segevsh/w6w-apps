import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "order-updated",
  title: "Order Updated",
  description: "Fires when an order changes. The run gets the order as it is now.",
  topics: ["orders/updated"],
  sampleResource: {
    id: 820982911946154500,
    name: "#1001",
    email: "jon@example.com",
    total_price: "199.00",
    currency: "USD",
    financial_status: "paid",
    fulfillment_status: null,
  },
});

export default trigger;
