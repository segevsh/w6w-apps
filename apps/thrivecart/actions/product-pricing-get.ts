import type { ActionDefinition } from "@w6w/types";
import { encodeId, ThriveCartClient } from "../lib/client.ts";
import { modeParam, productIdParam } from "../lib/params.ts";

/**
 * `GET /products/:product_id/pricing_options` — a product's price plans.
 *
 * The collection carries no example response for this endpoint, so no
 * response fields are typed here beyond the object itself — see
 * `docs.thrivecart.com` for the current shape. `affiliateId` is the one
 * documented query parameter (`?affiliate_id=`), used to price a purchase
 * made through a specific affiliate's link.
 */
interface Input {
  productId: string;
  affiliateId?: string;
  mode?: string;
}

const productPricingGet: ActionDefinition<Input> = {
  key: "product-pricing-get",
  type: "read",
  resource: "product",
  title: "Get Product Pricing",
  description: "Fetch a product's price plans and options.",
  params: [
    productIdParam,
    {
      key: "affiliateId",
      label: "Affiliate ID",
      type: "string",
      hint: "Optional. Price the purchase as if made through this affiliate's link.",
    },
    modeParam,
  ],
  output: [{ key: "data", type: "object", label: "Pricing options" }],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).get(
      `/products/${encodeId(input.productId)}/pricing_options`,
      { query: { affiliate_id: input.affiliateId }, mode: input.mode },
    );
  },
};

export default productPricingGet;
