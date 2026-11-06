import { paymentAction } from "../lib/actions.ts";

export default paymentAction({
  "key": "refund-payment",
  "title": "Refund Payment",
  "transactionType": "refundTransaction",
  "description":
    "Refund a settled transaction. For a card payment, provide its last four digits and expirationDate XXXX. Use Void Payment before settlement.",
});
