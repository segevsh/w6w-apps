import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  purchase_id: string;
  amount: number;
}

const refundPartially: ActionDefinition<Input> = {
  key: "refund-partially",
  type: "perform",
  resource: "purchase",
  title: "Refund Partially",
  description:
    "Refund part of a payment. The amount is treated as a discount and the order status does not change.",
  idempotent: false,
  params: [
    {
      key: "purchase_id",
      label: "Purchase ID",
      type: "string",
      required: true,
      hint: "The Digistore24 order ID, e.g. X26QE8GN.",
    },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      required: true,
      hint: "Must not exceed a payment amount.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Outcome" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "refundPartially",
      compact({ purchase_id: input.purchase_id, amount: input.amount }),
      { write: true },
    );
  },
};

export default refundPartially;
