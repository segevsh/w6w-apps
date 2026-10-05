import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `GET /v2/products/:product_id/custom_fields`
 */
interface Input {
  productId: string;
}

const customFieldList: ActionDefinition<Input> = {
  key: "custom-field-list",
  type: "read",
  resource: "custom-field",
  title: "List Custom Fields",
  description: "List the extra checkout fields a product collects from buyers.",
  params: [{
    "key": "productId",
    "label": "Product ID",
    "type": "string",
    "required": true,
    "hint":
      "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
  }],
  output: [{ "key": "customFields", "type": "array", "label": "Custom fields" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "GET",
      `/products/${seg(input.productId)}/custom_fields`,
    );
    return { customFields: body.custom_fields ?? [] };
  },
};

export default customFieldList;
