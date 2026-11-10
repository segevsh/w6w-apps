import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "order-paid",
  title: "Order Paid",
  description:
    "Fires when an order is paid in full. The run gets the order with its payment status.",
  topics: ["orders/paid"],
  sampleResource: {
    id: 820982911946154500,
    name: "#1001",
    email: "jon@example.com",
    total_price: "199.00",
    currency: "USD",
    financial_status: "paid",
  },
});

export default trigger;
