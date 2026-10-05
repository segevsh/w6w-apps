import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `DELETE /v2/products/:product_id/variant_categories/:variantCategoryId/variants/:variantId`
 * Needs the `edit_products` or `account` scope.
 */
interface Input {
  productId: string;
  variantCategoryId: string;
  variantId: string;
}

const variantDelete: ActionDefinition<Input> = {
  key: "variant-delete",
  type: "perform",
  resource: "variant",
  title: "Delete Variant",
  description: "Permanently delete a variant. Needs the `edit_products` or `account` scope.",
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
  }, { "key": "variantId", "label": "Variant ID", "type": "string", "required": true }],
  output: [{ "key": "message", "type": "string", "label": "Confirmation from Gumroad" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "DELETE",
      `/products/${seg(input.productId)}/variant_categories/${
        seg(input.variantCategoryId)
      }/variants/${seg(input.variantId)}`,
    );
    return { message: body.message ?? null };
  },
};

export default variantDelete;
