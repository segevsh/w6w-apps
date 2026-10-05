import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `GET /v2/products/:product_id/offer_codes`
 */
interface Input {
  productId: string;
}

const offerCodeList: ActionDefinition<Input> = {
  key: "offer-code-list",
  type: "read",
  resource: "offer-code",
  title: "List Offer Codes",
  description:
    "List a product's offer codes. Each has `amount_cents` or `percent_off`; universal codes apply to all products.",
  params: [{
    "key": "productId",
    "label": "Product ID",
    "type": "string",
    "required": true,
    "hint":
      "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
  }],
  output: [{ "key": "offerCodes", "type": "array", "label": "Offer codes" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "GET",
      `/products/${seg(input.productId)}/offer_codes`,
    );
    return { offerCodes: body.offer_codes ?? [] };
  },
};

export default offerCodeList;
