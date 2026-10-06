import { getAction } from "../lib/factory.ts";

/** `GET /v1/order-confirmations/{id}` */
export default getAction({
  key: "order-confirmation-get",
  title: "Get Order Confirmation",
  description: "Fetch one order confirmation with line items, totals, tax and payment conditions.",
  resource: "order-confirmation",
  path: "/order-confirmations/{id}",
  idLabel: "Order Confirmation id",
  output: [
    { key: "id", type: "string", label: "Id" },
    { key: "voucherNumber", type: "string", label: "Voucher number" },
    { key: "voucherStatus", type: "string", label: "Status (draft, open, ...)" },
    { key: "totalPrice", type: "object", label: "Totals" },
    { key: "lineItems", type: "array", label: "Line items" },
    { key: "version", type: "number", label: "Version" },
  ],
});
