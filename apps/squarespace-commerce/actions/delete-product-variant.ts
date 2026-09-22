import type { ActionDefinition } from "@w6w/types";
import { API_V2, SquarespaceClient } from "../lib/client.ts";

/**
 * `DELETE /v2/commerce/products/{productId}/variants/{variantId}` — delete a
 * variant.
 *
 * Answers `204` with no body, so the action reports `{ ok: true }`.
 *
 * Declared **not** idempotent for the same reason as `delete-product`: no
 * idempotency key exists on the route and a repeat answers `404`, so a retry
 * would report a failure for a delete that already succeeded. The product needs
 * at least one variant, so deleting the last one is refused by the vendor rather
 * than leaving a variantless product.
 */
interface Input {
  productId: string;
  variantId: string;
}

const deleteProductVariant: ActionDefinition<Input, { ok: true }> = {
  key: "delete-product-variant",
  type: "perform",
  resource: "product-variant",
  title: "Delete Product Variant",
  description:
    "Delete one variant from a product. Squarespace answers 204 and refuses to remove the " +
    "product's last variant.",
  idempotent: false,
  params: [
    { key: "productId", label: "Product id", type: "string", required: true },
    {
      key: "variantId",
      label: "Variant id",
      type: "string",
      required: true,
      hint: "The variant's `id`. A product must keep at least one variant.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "True when Squarespace accepted it (HTTP 204)" }],

  async execute(input, ctx) {
    const productId = encodeURIComponent(String(input.productId ?? "").trim());
    const variantId = encodeURIComponent(String(input.variantId ?? "").trim());
    await new SquarespaceClient(ctx).delete<void>(
      `${API_V2}/commerce/products/${productId}/variants/${variantId}`,
    );
    return { ok: true };
  },
};

export default deleteProductVariant;
