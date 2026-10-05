import type { ActionDefinition } from "@w6w/types";
import { Ds24Client } from "../lib/client.ts";

type Input = Record<string, never>;

const listVouchers: ActionDefinition<Input> = {
  key: "list-vouchers",
  type: "search",
  title: "List Vouchers",
  description: "List all voucher (coupon) codes.",
  params: [],
  output: [
    { key: "coupons", type: "array", label: "Vouchers" },
  ],

  execute(_input, ctx) {
    return new Ds24Client(ctx).call("listVouchers", {});
  },
};

export default listVouchers;
