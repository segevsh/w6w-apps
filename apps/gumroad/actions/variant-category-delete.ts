import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `DELETE /v2/products/:product_id/variant_categories/:variantCategoryId`
 * Needs the `edit_products` or `account` scope.
 */
interface Input {
  productId: string;
  variantCategoryId: string;
}

const variantCategoryDelete: ActionDefinition<Input> = {
  key: "variant-category-delete",
  type: "perform",
  resource: "variant",
  title: "Delete Variant Category",
  description:
    "Permanently delete a variant category. Needs the `edit_products` or `account` scope.",
  idempotent: false,
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
  output: [{ "key": "message", "type": "string", "label": "Confirmation from Gumroad" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "DELETE",
      `/products/${seg(input.productId)}/variant_categories/${seg(input.variantCategoryId)}`,
    );
    return { message: body.message ?? null };
  },
};

export default variantCategoryDelete;
