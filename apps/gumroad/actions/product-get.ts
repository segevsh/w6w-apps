import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `GET /v2/products/:product_id`
 */
interface Input {
  productId: string;
}

const productGet: ActionDefinition<Input> = {
  key: "product-get",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Fetch one product, including variants, tiers and custom_html.",
  params: [{
    "key": "productId",
    "label": "Product ID",
    "type": "string",
    "required": true,
    "hint":
      "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
  }],
  output: [{ "key": "id", "type": "string", "label": "Product id" }, {
    "key": "name",
    "type": "string",
    "label": "Name",
  }, { "key": "price", "type": "number", "label": "Price in cents" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("GET", `/products/${seg(input.productId)}`);
    return body.product;
  },
};

export default productGet;
