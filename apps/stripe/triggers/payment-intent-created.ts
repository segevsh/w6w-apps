import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "payment-intent-created",
  title: "Payment Intent Created",
  description:
    "Fires when a PaymentIntent is created. The run gets the event and the PaymentIntent.",
  events: ["payment_intent.created"],
  sampleObject: {
    id: "pi_3Nq0Za",
    object: "payment_intent",
    status: "requires_payment_method",
    amount: 2000,
    currency: "usd",
  },
});

export default trigger;
