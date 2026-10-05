import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `GET /v2/products/:product_id/variant_categories/:variantCategoryId`
 */
interface Input {
  productId: string;
  variantCategoryId: string;
}

const variantCategoryGet: ActionDefinition<Input> = {
  key: "variant-category-get",
  type: "read",
  resource: "variant",
  title: "Get Variant Category",
  description: "Fetch one variant category.",
  params: [{
    "key": "productId",
    "label": "Product ID",
    "type": "string",
    "required": true,
    "hint":
      "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
  }, {
    "key": "variantCategoryId",
    "label": "Variant category ID",
    "type": "string",
    "required": true,
  }],
  output: [{ "key": "id", "type": "string", "label": "Id" }, {
    "key": "title",
    "type": "string",
    "label": "Title",
  }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "GET",
      `/products/${seg(input.productId)}/variant_categories/${seg(input.variantCategoryId)}`,
    );
    return body.variant_category;
  },
};

export default variantCategoryGet;
