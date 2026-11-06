import { paymentAction } from "../lib/actions.ts";

export default paymentAction({
  "key": "charge-payment",
  "title": "Charge Payment",
  "transactionType": "authCaptureTransaction",
  "description":
    "Authorize and capture a payment in one operation using payment details, an Accept.js token or a saved profile.",
});
