import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "order-fulfilled",
  title: "Order Fulfilled",
  description:
    "Fires when every item of an order is fulfilled. The run gets the order and its fulfillments.",
  topics: ["orders/fulfilled"],
  sampleResource: { id: 820982911946154500, name: "#1001", fulfillment_status: "fulfilled" },
});

export default trigger;
