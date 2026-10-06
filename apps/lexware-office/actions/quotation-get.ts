import { getAction } from "../lib/factory.ts";

/** `GET /v1/quotations/{id}` */
export default getAction({
  key: "quotation-get",
  title: "Get Quotation",
  description: "Fetch one quotation with line items, totals, tax and payment conditions.",
  resource: "quotation",
  path: "/quotations/{id}",
  idLabel: "Quotation id",
  output: [
    { key: "id", type: "string", label: "Id" },
    { key: "voucherNumber", type: "string", label: "Voucher number" },
    { key: "voucherStatus", type: "string", label: "Status (draft, open, ...)" },
    { key: "totalPrice", type: "object", label: "Totals" },
    { key: "lineItems", type: "array", label: "Line items" },
    { key: "version", type: "number", label: "Version" },
  ],
});
