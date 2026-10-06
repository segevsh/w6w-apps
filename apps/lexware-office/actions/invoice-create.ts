import { salesCreateAction } from "../lib/factory.ts";

/** `POST /v1/invoices[?finalize=true]` */
export default salesCreateAction({
  key: "invoice-create",
  title: "Create Invoice",
  noun: "an invoice",
  resource: "invoice",
  path: "/invoices",
  required: "Required: voucherDate, address (contactId, or name + countryCode), lineItems, " +
    "totalPrice.currency, taxConditions.taxType, shippingConditions.shippingType.",
});
