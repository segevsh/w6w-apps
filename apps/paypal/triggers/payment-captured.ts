import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "payment-captured",
  title: "Payment Captured",
  description:
    "Fires when a payment capture completes. The run gets the event and the capture: amount, status and the order it belongs to.",
  eventTypes: ["PAYMENT.CAPTURE.COMPLETED"],
  sampleResource: {
    id: "5O190127TN364715T",
    status: "COMPLETED",
    amount: { currency_code: "USD", value: "20.00" },
  },
});

export default trigger;
