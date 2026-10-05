import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `DELETE /v2/products/:product_id`
 * Needs the `edit_products` or `account` scope.
 */
interface Input {
  productId: string;
}

const productDelete: ActionDefinition<Input> = {
  key: "product-delete",
  type: "perform",
  resource: "product",
  title: "Delete Product",
  description: "Permanently delete a product. Needs the `edit_products` or `account` scope.",
  idempotent: false,
  params: [{
    "key": "productId",
    "label": "Product ID",
    "type": "string",
    "required": true,
    "hint":
      "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
  }],
  output: [{ "key": "message", "type": "string", "label": "Confirmation from Gumroad" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("DELETE", `/products/${seg(input.productId)}`);
    return { message: body.message ?? null };
  },
};

export default productDelete;
