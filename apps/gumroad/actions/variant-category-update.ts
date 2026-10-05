import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `PUT /v2/products/:product_id/variant_categories/:variantCategoryId`
 * Needs the `edit_products` or `account` scope.
 */
interface Input {
  productId: string;
  variantCategoryId: string;
  title: string;
}

const variantCategoryUpdate: ActionDefinition<Input> = {
  key: "variant-category-update",
  type: "perform",
  resource: "variant",
  title: "Update Variant Category",
  description: "Rename a variant category. Needs the `edit_products` or `account` scope.",
  idempotent: true,
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
  }, { "key": "title", "label": "Title", "type": "string", "required": true }],
  output: [{ "key": "id", "type": "string", "label": "Id" }, {
    "key": "title",
    "type": "string",
    "label": "Title",
  }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "PUT",
      `/products/${seg(input.productId)}/variant_categories/${seg(input.variantCategoryId)}`,
      {
        form: { title: input.title },
      },
    );
    return body.variant_category;
  },
};

export default variantCategoryUpdate;
