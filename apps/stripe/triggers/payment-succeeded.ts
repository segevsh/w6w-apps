import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "payment-succeeded",
  title: "Payment Succeeded",
  description:
    "Fires when a payment succeeds. The run gets the event and the PaymentIntent: amount, currency, customer and status.",
  events: ["payment_intent.succeeded"],
  sampleObject: {
    id: "pi_3Nq0Za",
    object: "payment_intent",
    amount: 2000,
    currency: "usd",
    customer: "cus_Oa1b2c",
    status: "succeeded",
  },
});

export default trigger;
