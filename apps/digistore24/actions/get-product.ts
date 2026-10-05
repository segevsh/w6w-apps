import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  product_id: number;
}

const getProduct: ActionDefinition<Input> = {
  key: "get-product",
  type: "read",
  title: "Get Product",
  description: "Return the details of one product.",
  params: [
    { key: "product_id", label: "Product ID", type: "number", required: true },
  ],
  output: [
    { key: "product", type: "object", label: "Product" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call("getProduct", compact({ product_id: input.product_id }));
  },
};

export default getProduct;
