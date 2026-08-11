import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, encodeId } from "../lib/client.ts";
import {
  type FieldSelectionInput,
  fieldSelectionParams,
  fieldSelectionQuery,
  productIdParam,
} from "../lib/params.ts";

/**
 * `GET /v3/catalog/products/{product_id}/variants/{variant_id}` — one variant.
 *
 * A variant is addressed under its product, not on its own: there is no
 * `/v3/catalog/variants/{id}` path in the Product Variants document. Use
 * `variant-list` if you have only the variant's SKU or ID.
 */
interface Input extends FieldSelectionInput {
  productId: number;
  variantId: number;
}

const variantGet: ActionDefinition<Input> = {
  key: "variant-get",
  type: "read",
  resource: "variant",
  title: "Get Variant",
  description: "Fetch one product variant. Both the product ID and the variant ID are required.",
  params: [
    productIdParam,
    {
      key: "variantId",
      label: "Variant ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    ...fieldSelectionParams(),
  ],
  output: [
    { key: "id", type: "number", label: "Variant ID" },
    { key: "sku", type: "string", label: "SKU" },
    { key: "price", type: "number", label: "Price" },
    { key: "inventory_level", type: "number", label: "Inventory level" },
  ],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3(
      `/catalog/products/${encodeId(input.productId)}/variants/${encodeId(input.variantId)}`,
      { query: fieldSelectionQuery(input) },
    );
  },
};

export default variantGet;
