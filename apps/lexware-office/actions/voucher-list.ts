import { listAction, yesNo } from "../lib/factory.ts";

/**
 * `GET /v1/voucherlist` — metadata for every voucher type. `voucherType` and `voucherStatus`
 * are mandatory (comma list or `any`). Paged to a 10,000-entry window; narrow the dates beyond
 * that. Details of one voucher come from the endpoint named by its `voucherType`.
 */
export default listAction({
  key: "voucher-list",
  title: "List Vouchers",
  description: "Search the voucher list across invoices, credit notes, quotations, order " +
    "confirmations, delivery notes and bookkeeping vouchers. This is how you list invoices.",
  resource: "voucher",
  path: "/voucherlist",
  paged: true,
  query: {
    voucherType: "voucherType",
    voucherStatus: "voucherStatus",
    archived: "archived",
    contactId: "contactId",
    voucherNumber: "voucherNumber",
    voucherDateFrom: "voucherDateFrom",
    voucherDateTo: "voucherDateTo",
    createdDateFrom: "createdDateFrom",
    createdDateTo: "createdDateTo",
    updatedDateFrom: "updatedDateFrom",
    updatedDateTo: "updatedDateTo",
    sort: "sort",
  },
  params: [
    {
      key: "voucherType",
      label: "Voucher types",
      type: "string",
      required: true,
      default: "any",
      hint: "Comma list of: invoice, downpaymentinvoice, creditnote, orderconfirmation, " +
        "quotation, deliverynote, salesinvoice, salescreditnote, purchaseinvoice, " +
        "purchasecreditnote — or `any`.",
    },
    {
      key: "voucherStatus",
      label: "Voucher statuses",
      type: "string",
      required: true,
      default: "any",
      hint: "Comma list of: draft, open, paid, paidoff, voided, transferred, sepadebit, " +
        "overdue, accepted, rejected, unchecked — or `any`.",
    },
    { key: "archived", label: "Archived", type: "select", options: yesNo },
    { key: "contactId", label: "Contact id", type: "string" },
    { key: "voucherNumber", label: "Voucher number", type: "string" },
    { key: "voucherDateFrom", label: "Voucher date from", type: "string", hint: "yyyy-MM-dd" },
    { key: "voucherDateTo", label: "Voucher date to", type: "string", hint: "yyyy-MM-dd" },
    { key: "createdDateFrom", label: "Created from", type: "string", hint: "yyyy-MM-dd" },
    { key: "createdDateTo", label: "Created to", type: "string", hint: "yyyy-MM-dd" },
    { key: "updatedDateFrom", label: "Updated from", type: "string", hint: "yyyy-MM-dd" },
    { key: "updatedDateTo", label: "Updated to", type: "string", hint: "yyyy-MM-dd" },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      hint: "voucherDate, voucherNumber, createdDate or updatedDate, optionally `,ASC`/`,DESC`.",
    },
  ],
});
