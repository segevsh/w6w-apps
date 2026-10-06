import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient } from "../lib/client.ts";

interface Input {
  categoryId?: string;
}

/** `GET /products` — List the Printful product catalog (the blank products you can print on), optionally by category. */
const catalogProductList: ActionDefinition<Input> = {
  key: "catalog-product-list",
  type: "search",
  resource: "catalog-product",
  title: "List Catalog Products",
  description:
    "List the Printful product catalog (the blank products you can print on), optionally by category.",
  params: [
    {
      key: "categoryId",
      label: "Category IDs",
      type: "string",
      hint: "Comma-separated category ids from List Categories.",
    },
  ],
  output: [
    { key: "products", type: "array", label: "Catalog products" },
  ],

  async execute(input, ctx) {
    const { items, paging } = await new PrintfulClient(ctx).list("/products", {
      query: { category_id: input.categoryId },
    });
    return { products: items, ...(paging ? { paging } : {}) };
  },
};

export default catalogProductList;
