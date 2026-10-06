import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient, seg } from "../lib/client.ts";

interface Input {
  productId: number;
}

/** `GET /products/{productId}` — Get one catalog product together with all of its variants. */
const catalogProductGet: ActionDefinition<Input> = {
  key: "catalog-product-get",
  type: "read",
  resource: "catalog-product",
  title: "Get Catalog Product",
  description: "Get one catalog product together with all of its variants.",
  params: [
    {
      key: "productId",
      label: "Product ID",
      type: "number",
      required: true,
      hint: "Catalog product id from List Catalog Products.",
    },
  ],
  output: [
    { key: "product", type: "object", label: "Product" },
    { key: "variants", type: "array", label: "Variants" },
  ],

  async execute(input, ctx) {
    const result = await new PrintfulClient(ctx).request<Record<string, unknown>>(
      "GET",
      `/products/${seg(input.productId)}`,
    );
    return result ?? {};
  },
};

export default catalogProductGet;
