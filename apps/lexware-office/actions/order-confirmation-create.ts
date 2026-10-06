import { salesCreateAction } from "../lib/factory.ts";

/** `POST /v1/order-confirmations[?finalize=true]` */
export default salesCreateAction({
  key: "order-confirmation-create",
  title: "Create Order Confirmation",
  noun: "an order confirmation",
  resource: "order-confirmation",
  path: "/order-confirmations",
  required: "Required: voucherDate, address, lineItems, totalPrice.currency, " +
    "taxConditions.taxType.",
});
