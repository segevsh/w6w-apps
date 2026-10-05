import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  code: string;
}

const deleteVoucher: ActionDefinition<Input> = {
  key: "delete-voucher",
  type: "perform",
  resource: "voucher",
  title: "Delete Voucher",
  description: "Delete a voucher code.",
  idempotent: true,
  params: [
    { key: "code", label: "Voucher code", type: "string", required: true },
  ],
  output: [{ key: "result", type: "object", label: "Digistore24 response data" }],

  execute(input, ctx) {
    return new Ds24Client(ctx).call("deleteVoucher", compact({ code: input.code }), {
      write: true,
    });
  },
};

export default deleteVoucher;
