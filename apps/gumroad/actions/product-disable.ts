import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `PUT /v2/products/:product_id/disable`
 * Needs the `edit_products` or `account` scope.
 */
interface Input {
  productId: string;
}

const productDisable: ActionDefinition<Input> = {
  key: "product-disable",
  type: "perform",
  resource: "product",
  title: "Unpublish Product",
  description: "Disable (unpublish) a product. Needs the `edit_products` or `account` scope.",
  idempotent: true,
  params: [{
    "key": "productId",
    "label": "Product ID",
    "type": "string",
    "required": true,
    "hint":
      "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
  }],
  output: [{ "key": "id", "type": "string", "label": "Product id" }, {
    "key": "published",
    "type": "boolean",
    "label": "Whether it is live",
  }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "PUT",
      `/products/${seg(input.productId)}/disable`,
    );
    return body.product;
  },
};

export default productDisable;
