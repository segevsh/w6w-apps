import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "payment-failed",
  title: "Payment Failed",
  description:
    "Fires when a payment attempt fails. The run gets the event and the PaymentIntent with its last payment error.",
  events: ["payment_intent.payment_failed"],
  sampleObject: {
    id: "pi_3Nq0Zb",
    object: "payment_intent",
    amount: 2000,
    currency: "usd",
    customer: "cus_Oa1b2c",
    status: "requires_payment_method",
    last_payment_error: { code: "card_declined" },
  },
});

export default trigger;
