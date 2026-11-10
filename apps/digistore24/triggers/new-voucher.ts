import { snapshotFeed } from "../lib/triggers.ts";
import action from "../actions/list-vouchers.ts";

type Item = Record<string, unknown>;

/**
 * `listVouchers` returns every voucher (coupon) code in one response (no paging parameters,
 * `digistore24.com/api/docs/paths/listVouchers.yaml`; the list is under `coupons`), so it is
 * snapshotted and diffed by the voucher's id.
 */
export default snapshotFeed({
  key: "new-voucher",
  title: "New Voucher",
  description: "The run gets each voucher (coupon) code newly created in Digistore24.",
  action,
  items: (result) => (result as { coupons?: Item[] }).coupons ?? [],
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "number", label: "Voucher ID" },
    { key: "code", type: "string", label: "Voucher code" },
    { key: "product_ids", type: "string", label: "Applicable product IDs or all" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "expires_at", type: "string", label: "Expires at" },
  ],
  sample: {
    id: 2477,
    code: "WELCOME10",
    product_ids: "all",
    currency: "EUR",
    expires_at: null,
  },
});
