import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "payment-intent-canceled",
  title: "Payment Intent Canceled",
  description:
    "Fires when a PaymentIntent is canceled. The run gets the event and the PaymentIntent with its cancellation reason.",
  events: ["payment_intent.canceled"],
  sampleObject: {
    id: "pi_3Nq0Za",
    object: "payment_intent",
    status: "canceled",
    amount: 2000,
    currency: "usd",
    cancellation_reason: "requested_by_customer",
  },
});

export default trigger;
