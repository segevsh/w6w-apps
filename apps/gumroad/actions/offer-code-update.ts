import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `PUT /v2/products/:product_id/offer_codes/:offerCodeId`
 * Needs the `edit_products` or `account` scope.
 */
interface Input {
  productId: string;
  offerCodeId: string;
  maxPurchaseCount?: number;
  minimumAmountCents?: number;
}

const offerCodeUpdate: ActionDefinition<Input> = {
  key: "offer-code-update",
  type: "perform",
  resource: "offer-code",
  title: "Update Offer Code",
  description:
    "Change an offer code's usage cap or minimum order amount. The code and discount itself cannot be edited. Needs the `edit_products` or `account` scope.",
  idempotent: true,
  params: [
    {
      "key": "productId",
      "label": "Product ID",
      "type": "string",
      "required": true,
      "hint":
        "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
    },
    { "key": "offerCodeId", "label": "Offer code ID", "type": "string", "required": true },
    { "key": "maxPurchaseCount", "label": "Max purchase count", "type": "number" },
    {
      "key": "minimumAmountCents",
      "label": "Minimum order amount",
      "type": "number",
      "hint": "Cents.",
    },
  ],
  output: [{ "key": "id", "type": "string", "label": "Id" }, {
    "key": "max_purchase_count",
    "type": "number",
    "label": "Usage cap",
  }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "PUT",
      `/products/${seg(input.productId)}/offer_codes/${seg(input.offerCodeId)}`,
      {
        form: {
          max_purchase_count: input.maxPurchaseCount,
          minimum_amount_cents: input.minimumAmountCents,
        },
      },
    );
    return body.offer_code;
  },
};

export default offerCodeUpdate;
