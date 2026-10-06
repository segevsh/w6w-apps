import type { ActionDefinition } from "@w6w/types";
import { SallaClient, seg } from "../lib/client.ts";

interface Input {
  coupon_id: number;
}

const couponGet: ActionDefinition<Input> = {
  key: "coupon-get",
  type: "read",
  resource: "coupon",
  title: "Get Coupon",
  description: "Fetch one coupon by ID. Needs the `marketing.read` scope.",

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
      "key": "status",
      "type": "number",
      "label": "HTTP status echoed in the envelope",
    },
    {
      "key": "success",
      "type": "boolean",
      "label": "Always true on success",
    },
    {
      "key": "data",
      "type": "object",
      "label": "The record",
    },
  ],

  execute(input, ctx) {
    const client = new SallaClient(ctx);
    return client.get(`/coupons/${seg(input.coupon_id)}`);
  },
};

export default couponGet;
