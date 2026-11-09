import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "order-created",
  title: "New Order",
  description:
    "Fires when an order is created. The run gets the order: status, totals, billing, shipping and line items.",
  topics: ["order.created"],
  samplePayload: {
    id: 727,
    status: "processing",
    total: "29.99",
    currency: "USD",
    billing: { email: "john.doe@example.com" },
  },
});

export default trigger;
