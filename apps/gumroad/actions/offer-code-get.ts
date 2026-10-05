import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `GET /v2/products/:product_id/offer_codes/:offerCodeId`
 */
interface Input {
  productId: string;
  offerCodeId: string;
}

const offerCodeGet: ActionDefinition<Input> = {
  key: "offer-code-get",
  type: "read",
  resource: "offer-code",
  title: "Get Offer Code",
  description: "Fetch one offer code.",
  params: [{
    "key": "productId",
    "label": "Product ID",
    "type": "string",
    "required": true,
    "hint":
      "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
  }, { "key": "offerCodeId", "label": "Offer code ID", "type": "string", "required": true }],
  output: [{ "key": "id", "type": "string", "label": "Id" }, {
    "key": "name",
    "type": "string",
    "label": "Code",
  }, { "key": "times_used", "type": "number", "label": "Times used" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "GET",
      `/products/${seg(input.productId)}/offer_codes/${seg(input.offerCodeId)}`,
    );
    return body.offer_code;
  },
};

export default offerCodeGet;
