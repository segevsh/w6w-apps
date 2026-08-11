import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, encodeId } from "../lib/client.ts";
import { productIdParam } from "../lib/params.ts";

/**
 * `DELETE /v3/catalog/products/{product_id}` — delete one product. Answers `204`.
 *
 * **Only the single-product form is exposed.** BigCommerce also offers
 * `DELETE /v3/catalog/products` with filter query parameters, which deletes every
 * product matching them. A filter that resolves to "everything" is one typo away
 * from emptying a catalog with no undo, and no workflow needs it badly enough.
 * The same reasoning keeps `DELETE /v2/orders` ("Delete All Orders") out of this
 * app entirely.
 */
interface Input {
  productId: number;
}

const productDelete: ActionDefinition<Input> = {
  key: "product-delete",
  type: "perform",
  resource: "product",
  title: "Delete Product",
  description: "Permanently delete one product by ID. There is no undo.",
  // Deleting an already-deleted product 404s rather than doing damage, so a
  // retry cannot produce a second, different effect.
  idempotent: true,
  params: [productIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    const status = await new BigCommerceClient(ctx).status(
      `/v3/catalog/products/${encodeId(input.productId)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default productDelete;
