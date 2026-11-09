import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "checkout-completed",
  title: "Checkout Completed",
  description:
    "Fires when a customer completes a Checkout Session. The run gets the event and the Session: customer details, amount total and mode.",
  events: ["checkout.session.completed"],
  sampleObject: {
    id: "cs_test_a1b2c3",
    object: "checkout.session",
    mode: "payment",
    amount_total: 2000,
    currency: "usd",
    payment_status: "paid",
  },
});

export default trigger;
