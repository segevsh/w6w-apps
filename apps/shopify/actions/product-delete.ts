import type { ActionDefinition } from "@w6w/types";
import { ShopifyClient } from "../lib/client.ts";

/**
 * Permanent. To take a product off the storefront reversibly, set its status
 * to `archived` with `product-update` instead.
 */
const productDelete: ActionDefinition<{ productId: number }> = {
  key: "product-delete",
  type: "perform",
  resource: "product",
  title: "Delete Product",
  description:
    "Permanently delete a product. Archive it with `product-update` instead for a reversible removal.",
  idempotent: true,
  params: [{ key: "productId", label: "Product ID", type: "number", required: true }],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  execute(input, ctx) {
    return new ShopifyClient(ctx).request(`/products/${input.productId}.json`, {
      method: "DELETE",
    });
  },
};

export default productDelete;
