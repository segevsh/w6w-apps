import { salesCreateAction } from "../lib/factory.ts";

/** `POST /v1/quotations[?finalize=true]` */
export default salesCreateAction({
  key: "quotation-create",
  title: "Create Quotation",
  noun: "a quotation",
  resource: "quotation",
  path: "/quotations",
  required: "Required: voucherDate, expirationDate, address, lineItems, totalPrice.currency, " +
    "taxConditions.taxType.",
});
