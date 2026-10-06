import type { ActionDefinition } from "@w6w/types";
import { encodeId, RegfoxClient } from "../lib/client.ts";
import { requiredId } from "../lib/params.ts";

/** `GET /v2/public/coupons/{id}` */
const couponGet: ActionDefinition<Record<string, unknown>> = {
  key: "coupon-get",
  type: "read",
  resource: "coupon",
  title: "Get Coupon",
  description: "Get one coupon, with its discounts and codes, by id.",
  params: [requiredId("couponId", "Coupon ID")],
  output: [{ key: "coupon", type: "object", label: "The coupon" }],
  async execute(input, ctx) {
    const body = await new RegfoxClient(ctx).call(`/coupons/${encodeId(input.couponId)}`);
    return { coupon: body.data };
  },
};

export default couponGet;
