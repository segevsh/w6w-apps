import { webhookTrigger } from "../lib/triggers.ts";

/** An Adyen notification arrives (`eventCode` `CAPTURE`). */
const trigger = webhookTrigger({
  key: "payment-capture",
  title: "Payment Capture",
  description:
    "Fires when Adyen reports the result of a capture. The run gets the event code, success flag, the capture's PSP reference, the original payment reference, amount and currency.",
  eventCode: "CAPTURE",
  sample: {
    eventCode: "CAPTURE",
    success: true,
    pspReference: "9915555555555555",
    originalReference: "9915555555555555",
    merchantAccountCode: "SampleMerchantAccount",
    merchantReference: "order-1042",
    amountValue: 1130,
    currency: "EUR",
    eventDate: "2026-11-10T09:15:00+01:00",
    paymentMethod: "visa",
    reason: null,
    live: false,
    additionalData: { authCode: "053099" },
  },
});

export default trigger;
