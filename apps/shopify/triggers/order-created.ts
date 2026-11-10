import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "order-created",
  title: "New Order",
  description:
    "Fires when an order is placed. The run gets the order: customer, line items, totals and statuses.",
  topics: ["orders/create"],
  sampleResource: {
    id: 820982911946154500,
    name: "#1001",
    email: "jon@example.com",
    total_price: "199.00",
    currency: "USD",
    financial_status: "pending",
  },
});

export default trigger;
