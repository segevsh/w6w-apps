import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `PUT /v2/products/:product_id/variant_categories/:variantCategoryId/variants/:variantId`
 * Needs the `edit_products` or `account` scope.
 */
interface Input {
  productId: string;
  variantCategoryId: string;
  variantId: string;
  name?: string;
  priceDifferenceCents?: number;
  maxPurchaseCount?: number;
}

const variantUpdate: ActionDefinition<Input> = {
  key: "variant-update",
  type: "perform",
  resource: "variant",
  title: "Update Variant",
  description: "Edit a variant. Needs the `edit_products` or `account` scope.",
  idempotent: true,
  params: [
    {
      "key": "productId",
      "label": "Product ID",
      "type": "string",
      "required": true,
      "hint":
        "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
    },
    {
      "key": "variantCategoryId",
      "label": "Variant category ID",
      "type": "string",
      "required": true,
    },
    { "key": "variantId", "label": "Variant ID", "type": "string", "required": true },
    { "key": "name", "label": "Name", "type": "string" },
    {
      "key": "priceDifferenceCents",
      "label": "Price difference",
      "type": "number",
      "hint": "Cents added to the product price.",
    },
    { "key": "maxPurchaseCount", "label": "Max purchase count", "type": "number" },
  ],
  output: [{ "key": "id", "type": "string", "label": "Id" }, {
    "key": "name",
    "type": "string",
    "label": "Name",
  }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "PUT",
      `/products/${seg(input.productId)}/variant_categories/${
        seg(input.variantCategoryId)
      }/variants/${seg(input.variantId)}`,
      {
        form: {
          name: input.name,
          price_difference_cents: input.priceDifferenceCents,
          max_purchase_count: input.maxPurchaseCount,
        },
      },
    );
    return body.variant;
  },
};

export default variantUpdate;
