import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { modeParam } from "../lib/params.ts";

interface Product {
  product_id: string;
  name: string;
  label?: string;
  url?: string;
  embed_type?: string;
  status?: string;
  statusString?: string;
  type?: string;
  typeString?: string;
}

/**
 * `GET /products` — every product in the account. The vendor returns a bare
 * array with no filter or pagination parameters documented anywhere; this
 * action wraps it as `{ items }` for a consistent shape with the other list
 * actions in this app.
 */
interface Input {
  mode?: string;
}

const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "search",
  resource: "product",
  title: "List Products",
  description: "List every product in the account.",
  params: [modeParam],
  output: [{ key: "items", type: "array", label: "Products" }],

  async execute(input, ctx) {
    const items = await new ThriveCartClient(ctx).get<Product[]>("/products", {
      mode: input.mode,
    });
    return { items: items ?? [] };
  },
};

export default productList;
