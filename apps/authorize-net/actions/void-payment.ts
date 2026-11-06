import { paymentAction } from "../lib/actions.ts";

export default paymentAction({
  "key": "void-payment",
  "title": "Void Payment",
  "transactionType": "voidTransaction",
  "description":
    "Void an unsettled transaction or unused authorization. Settled transactions must be refunded instead.",
});
