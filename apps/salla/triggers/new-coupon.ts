import { pagedSnapshotTrigger } from "../lib/triggers.ts";
import couponList from "../actions/coupon-list.ts";

/**
 * `coupon-list` documents no sort order and no created-since filter
 * (https://docs.salla.dev/pagination.md and the endpoint page), so each check reads the whole list
 * (a store keeps tens to hundreds of coupons) and diffs ids.
 */
export default pagedSnapshotTrigger({
  key: "new-coupon",
  title: "New Coupon",
  description: "The run gets each discount coupon newly created in the store.",
  action: couponList,
  maxPages: 10,
  minIntervalMs: 300000,
  output: [
    { key: "id", type: "number", label: "Coupon ID" },
    { key: "code", type: "string", label: "Code" },
    { key: "type", type: "string", label: "Type" },
  ],
  sample: { id: 6901, code: "SAVE10", type: "percentage" },
});
