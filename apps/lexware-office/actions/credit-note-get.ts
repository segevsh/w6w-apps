import { getAction } from "../lib/factory.ts";

/** `GET /v1/credit-notes/{id}` */
export default getAction({
  key: "credit-note-get",
  title: "Get Credit Note",
  description: "Fetch one credit note with line items, totals, tax and payment conditions.",
  resource: "credit-note",
  path: "/credit-notes/{id}",
  idLabel: "Credit Note id",
  output: [
    { key: "id", type: "string", label: "Id" },
    { key: "voucherNumber", type: "string", label: "Voucher number" },
    { key: "voucherStatus", type: "string", label: "Status (draft, open, ...)" },
    { key: "totalPrice", type: "object", label: "Totals" },
    { key: "lineItems", type: "array", label: "Line items" },
    { key: "version", type: "number", label: "Version" },
  ],
});
