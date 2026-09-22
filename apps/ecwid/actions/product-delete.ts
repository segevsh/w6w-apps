import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, encodeId } from "../lib/client.ts";
import { productIdParam } from "../lib/params.ts";

/**
 * `DELETE /products/{productId}` — delete a product.
 *
 * Answers `{"deleteCount": 1}` when the product was deleted and
 * `{"deleteCount": 0}` when it was not — a documented distinction worth
 * returning rather than collapsing into "the call returned 200", because a `0`
 * means the id did not address a product this store has.
 *
 * Marked idempotent in the sense the runtime cares about: the end state after
 * one call and after five is the same product gone. A repeat call answers `404
 * PRODUCT_NOT_FOUND`, which surfaces as an error — worth seeing, since it
 * usually means the id was wrong.
 */
interface Input {
  productId: string;
}

const productDelete: ActionDefinition<Input> = {
  key: "product-delete",
  type: "perform",
  resource: "product",
  title: "Delete Product",
  description:
    "Delete a product. Returns the vendor's `deleteCount`: 1 if it was deleted, 0 if it was not.",
  idempotent: true,
  params: [productIdParam],
  output: [
    { key: "deleteCount", type: "number", label: "1 when the product was deleted, 0 otherwise" },
  ],

  execute(input, ctx) {
    return new EcwidClient(ctx).json(`/products/${encodeId(input.productId)}`, {
      method: "DELETE",
    });
  },
};

export default productDelete;
