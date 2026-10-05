import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `DELETE /v2/products/:product_id/offer_codes/:offerCodeId`
 * Needs the `edit_products` or `account` scope.
 */
interface Input {
  productId: string;
  offerCodeId: string;
}

const offerCodeDelete: ActionDefinition<Input> = {
  key: "offer-code-delete",
  type: "perform",
  resource: "offer-code",
  title: "Delete Offer Code",
  description: "Permanently delete an offer code. Needs the `edit_products` or `account` scope.",
  idempotent: false,
  params: [{
    "key": "productId",
    "label": "Product ID",
    "type": "string",
    "required": true,
    "hint":
      "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
  }, { "key": "offerCodeId", "label": "Offer code ID", "type": "string", "required": true }],
  output: [{ "key": "message", "type": "string", "label": "Confirmation from Gumroad" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "DELETE",
      `/products/${seg(input.productId)}/offer_codes/${seg(input.offerCodeId)}`,
    );
    return { message: body.message ?? null };
  },
};

export default offerCodeDelete;
