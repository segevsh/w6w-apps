import type { ActionDefinition } from "@w6w/types";
import { GumroadClient } from "../lib/client.ts";

/**
 * `GET /v2/products`
 * Needs the `view_profile` or `account` scope.
 */
type Input = Record<string, never>;

const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "read",
  resource: "product",
  title: "List Products",
  description:
    "List every product of the authenticated seller. Needs the `view_profile` or `account` scope.",
  params: [],
  output: [{ "key": "products", "type": "array", "label": "The seller's products" }],

  async execute(_input, ctx) {
    const body = await new GumroadClient(ctx).call("GET", `/products`);
    return { products: body.products ?? [] };
  },
};

export default productList;
