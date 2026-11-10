import { webhookTrigger } from "../lib/triggers.ts";

/** An Adyen notification arrives (`eventCode` `CANCELLATION`). */
const trigger = webhookTrigger({
  key: "payment-cancellation",
  title: "Payment Cancellation",
  description:
    "Fires when Adyen reports the result of a cancellation. The run gets the event code, success flag, the PSP reference, the original payment reference and the merchant reference.",
  eventCode: "CANCELLATION",
  sample: {
    eventCode: "CANCELLATION",
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
