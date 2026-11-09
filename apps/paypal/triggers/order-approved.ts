import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "order-approved",
  title: "Order Approved",
  description:
    "Fires when a buyer approves a checkout order, ready to capture. The run gets the event and the order.",
  eventTypes: ["CHECKOUT.ORDER.APPROVED"],
  sampleResource: { id: "5O190127TN364715T", status: "APPROVED", intent: "CAPTURE" },
});

export default trigger;
