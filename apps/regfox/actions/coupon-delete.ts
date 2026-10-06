import type { ActionDefinition } from "@w6w/types";
import { encodeId, RegfoxClient } from "../lib/client.ts";
import { requiredId } from "../lib/params.ts";

/** `DELETE /v2/public/coupons/{id}` — answers 204 on success. */
const couponDelete: ActionDefinition<Record<string, unknown>> = {
  key: "coupon-delete",
  type: "perform",
  resource: "coupon",
  title: "Delete Coupon",
  description: "Delete a coupon and all of its codes. This cannot be undone.",
  idempotent: true,
  params: [requiredId("couponId", "Coupon ID")],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],
  async execute(input, ctx) {
    await new RegfoxClient(ctx).call(`/coupons/${encodeId(input.couponId)}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default couponDelete;
