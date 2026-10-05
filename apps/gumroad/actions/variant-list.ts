import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `GET /v2/products/:product_id/variant_categories/:variantCategoryId/variants`
 */
interface Input {
  productId: string;
  variantCategoryId: string;
}

const variantList: ActionDefinition<Input> = {
  key: "variant-list",
  type: "read",
  resource: "variant",
  title: "List Variants",
  description: "List the variants in a variant category.",
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
  output: [{ "key": "variants", "type": "array", "label": "Variants" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "GET",
      `/products/${seg(input.productId)}/variant_categories/${
        seg(input.variantCategoryId)
      }/variants`,
    );
    return { variants: body.variants ?? [] };
  },
};

export default variantList;
