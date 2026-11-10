import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "order-deleted",
  title: "Order Deleted",
  description: "Fires when an order is deleted. The run gets the id of the deleted order.",
  topics: ["order.deleted"],
  samplePayload: { id: 727 },
});

export default trigger;
