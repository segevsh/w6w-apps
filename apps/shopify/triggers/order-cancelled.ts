import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "order-cancelled",
  title: "Order Cancelled",
  description:
    "Fires when an order is cancelled. The run gets the order with its cancel reason and time.",
  topics: ["orders/cancelled"],
  sampleResource: {
    id: 820982911946154500,
    name: "#1001",
    cancel_reason: "customer",
    cancelled_at: "2026-11-09T10:12:50-05:00",
  },
});

export default trigger;
