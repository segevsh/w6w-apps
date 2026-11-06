import { paymentAction } from "../lib/actions.ts";

export default paymentAction({
  "key": "capture-payment",
  "title": "Capture Payment",
  "transactionType": "priorAuthCaptureTransaction",
  "description": "Capture a previously authorized payment, in full or for a specified amount.",
});
