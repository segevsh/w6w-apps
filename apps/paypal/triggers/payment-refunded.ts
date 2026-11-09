import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "payment-refunded",
  title: "Payment Refunded",
  description:
    "Fires when a captured payment is refunded. The run gets the event and the refund: amount and status.",
  eventTypes: ["PAYMENT.CAPTURE.REFUNDED"],
  sampleResource: {
    id: "1JU08902781691411",
    status: "COMPLETED",
    amount: { currency_code: "USD", value: "5.00" },
  },
});

export default trigger;
