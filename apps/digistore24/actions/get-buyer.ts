import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  buyer_id: number;
}

const getBuyer: ActionDefinition<Input> = {
  key: "get-buyer",
  type: "read",
  title: "Get Buyer",
  description: "Return one buyer's contact details.",
  params: [
    { key: "buyer_id", label: "Buyer ID", type: "number", required: true },
  ],
  output: [
    { key: "buyer", type: "object", label: "Buyer" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call("getBuyer", compact({ buyer_id: input.buyer_id }));
  },
};

export default getBuyer;
