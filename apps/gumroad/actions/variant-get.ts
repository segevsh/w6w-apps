import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `GET /v2/products/:product_id/variant_categories/:variantCategoryId/variants/:variantId`
 */
interface Input {
  productId: string;
  variantCategoryId: string;
  variantId: string;
}

const variantGet: ActionDefinition<Input> = {
  key: "variant-get",
  type: "read",
  resource: "variant",
  title: "Get Variant",
  description: "Fetch one variant.",
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
  }, { "key": "variantId", "label": "Variant ID", "type": "string", "required": true }],
  output: [{ "key": "id", "type": "string", "label": "Id" }, {
    "key": "name",
    "type": "string",
    "label": "Name",
  }, { "key": "price_difference_cents", "type": "number", "label": "Price difference in cents" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "GET",
      `/products/${seg(input.productId)}/variant_categories/${
        seg(input.variantCategoryId)
      }/variants/${seg(input.variantId)}`,
    );
    return body.variant;
  },
};

export default variantGet;
