import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `GET /v2/products/:product_id/variant_categories`
 */
interface Input {
  productId: string;
}

const variantCategoryList: ActionDefinition<Input> = {
  key: "variant-category-list",
  type: "read",
  resource: "variant",
  title: "List Variant Categories",
  description: "List a product's variant categories (e.g. sizes, colors, tiers).",
  params: [{
    "key": "productId",
    "label": "Product ID",
    "type": "string",
    "required": true,
    "hint":
      "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
  }],
  output: [{ "key": "variantCategories", "type": "array", "label": "Variant categories" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "GET",
      `/products/${seg(input.productId)}/variant_categories`,
    );
    return { variantCategories: body.variant_categories ?? [] };
  },
};

export default variantCategoryList;
