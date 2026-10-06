import type { ActionDefinition } from "@w6w/types";
import { SallaClient, seg } from "../lib/client.ts";

interface Input {
  coupon_id: number;
}

const couponDelete: ActionDefinition<Input> = {
  key: "coupon-delete",
  type: "perform",
  resource: "coupon",
  title: "Delete Coupon",
  description: "Delete a coupon by ID. Needs the `marketing.read_write` scope.",
  idempotent: true,
  params: [
    {
      "key": "coupon_id",
      "label": "Coupon ID",
      "type": "number",
      "required": true,
    },
  ],
  output: [
    {
      "key": "deleted",
      "type": "boolean",
      "label": "True when Salla accepted the delete",
    },
  ],

  execute(input, ctx) {
    const client = new SallaClient(ctx);
    return client.delete(`/coupons/${seg(input.coupon_id)}`);
  },
};

export default couponDelete;
