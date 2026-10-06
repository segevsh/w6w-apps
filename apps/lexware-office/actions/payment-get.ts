import { getAction } from "../lib/factory.ts";

/**
 * `GET /v1/payments/{voucherId}` — open amount, payment status and payment items. The vendor
 * answers an error for voucher kinds without payment data (quotations, drafts, ...).
 */
export default getAction({
  key: "payment-get",
  title: "Get Voucher Payments",
  description: "Open amount, payment status and payment items of an invoice or bookkeeping " +
    "voucher. Fails for quotations, drafts and other vouchers without payment data.",
  resource: "payment",
  path: "/payments/{id}",
  idLabel: "Voucher id",
  output: [
    { key: "openAmount", type: "string", label: "Open amount" },
    { key: "paymentStatus", type: "string", label: "Payment status" },
    { key: "voucherStatus", type: "string", label: "Voucher status" },
    { key: "paymentItems", type: "array", label: "Payment items" },
  ],
});
