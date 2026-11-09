import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "refund-created",
  title: "Refund Created",
  description:
    "Fires when a refund is created. The run gets the refund: order, amounts and line items.",
  topics: ["refunds/create"],
  sampleResource: {
    id: 929361462,
    order_id: 820982911946154500,
    note: "Customer returned the item",
  },
});

export default trigger;
