import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "order-deleted",
  title: "Order Deleted",
  description: "Fires when an order is deleted. The run gets the id of the deleted order.",
  topics: ["orders/delete"],
  sampleResource: { id: 820982911946154500 },
});

export default trigger;
