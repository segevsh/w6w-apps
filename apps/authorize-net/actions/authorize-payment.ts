import { paymentAction } from "../lib/actions.ts";

export default paymentAction({
  "key": "authorize-payment",
  "title": "Authorize Payment",
  "transactionType": "authOnlyTransaction",
  "description": "Authorize a payment without capture. Capture it later using Capture Payment.",
});
