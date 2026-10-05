import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `PUT /v2/products/:product_id/enable`
 * Needs the `edit_products` or `account` scope.
 */
interface Input {
  productId: string;
}

const productEnable: ActionDefinition<Input> = {
  key: "product-enable",
  type: "perform",
  resource: "product",
  title: "Publish Product",
  description: "Enable (publish) a product. Needs the `edit_products` or `account` scope.",
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
      `/products/${seg(input.productId)}/enable`,
    );
    return body.product;
  },
};

export default productEnable;
