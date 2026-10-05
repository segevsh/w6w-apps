import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  purchase_id: string;
}

const getPurchase: ActionDefinition<Input> = {
  key: "get-purchase",
  type: "read",
  title: "Get Purchase",
  description:
    "Return the full detail of one purchase: buyer, items, payment, billing and affiliate data.",
  params: [
    {
      key: "purchase_id",
      label: "Purchase ID",
      type: "string",
      required: true,
      hint: "The Digistore24 order ID, e.g. X26QE8GN.",
    },
  ],
  output: [
    { key: "purchase", type: "object", label: "Purchase" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call("getPurchase", compact({ purchase_id: input.purchase_id }));
  },
};

export default getPurchase;
