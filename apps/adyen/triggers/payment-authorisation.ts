import { webhookTrigger } from "../lib/triggers.ts";

/** An Adyen notification arrives (`eventCode` `AUTHORISATION`). */
const trigger = webhookTrigger({
  key: "payment-authorisation",
  title: "Payment Authorisation",
  description:
    "Fires when Adyen reports the result of a payment authorisation. The run gets the event code, success flag, PSP and merchant references, amount, currency and payment method.",
  eventCode: "AUTHORISATION",
  sample: {
    eventCode: "AUTHORISATION",
    success: true,
    pspReference: "9915555555555555",
    originalReference: null,
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
