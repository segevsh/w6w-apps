import type { ActionDefinition } from "@w6w/types";
import { API_V2, SquarespaceClient } from "../lib/client.ts";

/**
 * `DELETE /v2/commerce/products/{productId}` — delete a product.
 *
 * Answers `204` with no body, so the action reports `{ ok: true }`.
 *
 * Declared **not** idempotent: Squarespace has no idempotency key on this
 * route, and a second delete of the same id is a `404 Not found` rather than a
 * silent success — so a runtime retry after a partial failure would surface an
 * error for a delete that had already happened. Deleting a product removes its
 * variants and their inventory rows with it; the action's description says so
 * because there is no undo.
 */
interface Input {
  productId: string;
}

const deleteProduct: ActionDefinition<Input, { ok: true }> = {
  key: "delete-product",
  type: "perform",
  resource: "product",
  title: "Delete Product",
  description:
    "Delete a product (and its variants and inventory rows) by id. Squarespace answers 204; " +
    "this is irreversible.",
  idempotent: false,
  params: [{
    key: "productId",
    label: "Product id",
    type: "string",
    required: true,
    hint: "The product's `id` from List products. Deleting takes its variants with it.",
  }],
  output: [{ key: "ok", type: "boolean", label: "True when Squarespace accepted it (HTTP 204)" }],

  async execute(input, ctx) {
    const productId = encodeURIComponent(String(input.productId ?? "").trim());
    await new SquarespaceClient(ctx).delete<void>(`${API_V2}/commerce/products/${productId}`);
    return { ok: true };
  },
};

export default deleteProduct;
