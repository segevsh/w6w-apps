import type { ActionDefinition } from "@w6w/types";
import { asJson, BigCommerceClient, encodeId } from "../lib/client.ts";
import { productIdParam } from "../lib/params.ts";

/**
 * `PUT /v3/catalog/products/{product_id}` — a partial update.
 *
 * The body is free-form JSON rather than a generated form because
 * `product_Put` has no required fields and 50 optional ones: the useful shape is
 * "the handful you want to change", and a form of 50 mostly-empty inputs would
 * make that harder, not easier. Only the keys you send are altered; `id` is
 * read-only and comes from the path.
 */
interface Input {
  productId: number;
  fields: unknown;
}

const productUpdate: ActionDefinition<Input> = {
  key: "product-update",
  type: "perform",
  resource: "product",
  title: "Update Product",
  description: "Apply a partial update to one product. Only the fields you send are changed.",
  // Same body, same product, same result — a repeat is a no-op.
  idempotent: true,
  params: [
    productIdParam,
    {
      key: "fields",
      label: "Fields to change",
      type: "json",
      required: true,
      placeholder: '{ "price": 19.99, "is_visible": true }',
      hint: "A partial product object. Any writable field from the v3 Products schema.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Product ID" }],

  async execute(input, ctx) {
    const body = asJson<Record<string, unknown>>(input.fields, "Fields to change");
    return await new BigCommerceClient(ctx).v3(`/catalog/products/${encodeId(input.productId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default productUpdate;
