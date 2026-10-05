import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `POST /v2/products/:product_id/offer_codes`
 * Needs the `edit_products` or `account` scope.
 */
interface Input {
  productId: string;
  name: string;
  amountOff: number;
  offerType?: string;
  maxPurchaseCount?: number;
  minimumAmountCents?: number;
  universal?: boolean;
}

const offerCodeCreate: ActionDefinition<Input> = {
  key: "offer-code-create",
  type: "perform",
  resource: "offer-code",
  title: "Create Offer Code",
  description:
    "Create an offer code. Amount off is in cents unless Offer type is percent. Needs the `edit_products` or `account` scope.",
  idempotent: false,
  params: [
    {
      "key": "productId",
      "label": "Product ID",
      "type": "string",
      "required": true,
      "hint":
        "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
    },
    {
      "key": "name",
      "label": "Code",
      "type": "string",
      "required": true,
      "hint": "The coupon code a buyer types at checkout.",
    },
    {
      "key": "amountOff",
      "label": "Amount off",
      "type": "number",
      "required": true,
      "hint": "Cents, or a percentage when Offer type is `percent`.",
    },
    {
      "key": "offerType",
      "label": "Offer type",
      "type": "select",
      "hint": "Default `cents`.",
      "options": [{ "value": "cents", "label": "cents" }, {
        "value": "percent",
        "label": "percent",
      }],
    },
    { "key": "maxPurchaseCount", "label": "Max purchase count", "type": "number" },
    {
      "key": "minimumAmountCents",
      "label": "Minimum order amount",
      "type": "number",
      "hint": "Cents.",
    },
    {
      "key": "universal",
      "label": "Universal",
      "type": "boolean",
      "hint": "Apply to all products.",
    },
  ],
  output: [{ "key": "id", "type": "string", "label": "Id" }, {
    "key": "name",
    "type": "string",
    "label": "Code",
  }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "POST",
      `/products/${seg(input.productId)}/offer_codes`,
      {
        form: {
          name: input.name,
          amount_off: input.amountOff,
          offer_type: input.offerType,
          max_purchase_count: input.maxPurchaseCount,
          minimum_amount_cents: input.minimumAmountCents,
          universal: input.universal,
        },
      },
    );
    return body.offer_code;
  },
};

export default offerCodeCreate;
