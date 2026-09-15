import type { ActionDefinition } from "@w6w/types";
import { pathId, RecurlyClient } from "../lib/client.ts";

interface Input {
  couponId: string;
}

/**
 * `GET /coupons/{coupon_id}` — fetch a single coupon.
 *
 * `couponId` accepts Recurly's own ID with no prefix, or the coupon's code
 * prefixed `code-` — see `lib/client.ts` module doc §3.
 */
const getCoupon: ActionDefinition<Input> = {
  key: "get-coupon",
  type: "read",
  resource: "coupon",
  title: "Get Coupon",
  description: "Fetch a single coupon by Recurly ID or by code (prefixed `code-`).",
  params: [
    {
      key: "couponId",
      label: "Coupon ID",
      type: "string",
      required: true,
      hint: "Recurly ID (`e28zov4fw0v2`) or coupon code prefixed `code-` (`code-10off`).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Coupon ID" },
    { key: "code", type: "string", label: "Coupon code" },
    { key: "name", type: "string", label: "Name" },
    { key: "state", type: "string", label: "State" },
    { key: "discount", type: "object", label: "Discount configuration" },
  ],

  execute(input, ctx) {
    return RecurlyClient.fromConnection(ctx).request(`/coupons/${pathId(input.couponId)}`);
  },
};

export default getCoupon;
