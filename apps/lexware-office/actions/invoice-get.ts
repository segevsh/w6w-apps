import { getAction } from "../lib/factory.ts";

/** `GET /v1/invoices/{id}` */
export default getAction({
  key: "invoice-get",
  title: "Get Invoice",
  description: "Fetch one invoice with line items, totals, tax and payment conditions.",
  resource: "invoice",
  path: "/invoices/{id}",
  idLabel: "Invoice id",
  output: [
    { key: "id", type: "string", label: "Id" },
    { key: "voucherNumber", type: "string", label: "Voucher number" },
    { key: "voucherStatus", type: "string", label: "Status (draft, open, ...)" },
    { key: "totalPrice", type: "object", label: "Totals" },
    { key: "lineItems", type: "array", label: "Line items" },
    { key: "version", type: "number", label: "Version" },
  ],
});
