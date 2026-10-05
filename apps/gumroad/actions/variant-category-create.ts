import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `POST /v2/products/:product_id/variant_categories`
 * Needs the `edit_products` or `account` scope.
 */
interface Input {
  productId: string;
  title: string;
}

const variantCategoryCreate: ActionDefinition<Input> = {
  key: "variant-category-create",
  type: "perform",
  resource: "variant",
  title: "Create Variant Category",
  description:
    "Create a variant category on a product. Needs the `edit_products` or `account` scope.",
  idempotent: false,
  params: [{
    "key": "productId",
    "label": "Product ID",
    "type": "string",
    "required": true,
    "hint":
      "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
  }, { "key": "title", "label": "Title", "type": "string", "required": true }],
  output: [{ "key": "id", "type": "string", "label": "Id" }, {
    "key": "title",
    "type": "string",
    "label": "Title",
  }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "POST",
      `/products/${seg(input.productId)}/variant_categories`,
      {
        form: { title: input.title },
      },
    );
    return body.variant_category;
  },
};

export default variantCategoryCreate;
