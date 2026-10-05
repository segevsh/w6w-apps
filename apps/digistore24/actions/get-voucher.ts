import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  code: string;
}

const getVoucher: ActionDefinition<Input> = {
  key: "get-voucher",
  type: "read",
  title: "Get Voucher",
  description: "Return one voucher code's settings.",
  params: [
    { key: "code", label: "Voucher code", type: "string", required: true },
  ],
  output: [
    { key: "coupon", type: "object", label: "Voucher" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call("getVoucher", compact({ code: input.code }));
  },
};

export default getVoucher;
