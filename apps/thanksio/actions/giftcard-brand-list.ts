import type { ActionDefinition } from "@w6w/types";
import { ThanksioClient } from "../lib/client.ts";

/**
 * `GET /api/v2/giftcard-brands-list` — measured live 2026-10-06: `{"brands":[{brand_code,
 * title, image, available_amounts (cents), group}]}`. Answers 200 without a credential.
 */
type Input = Record<string, never>;

const giftcardBrandList: ActionDefinition<Input> = {
  key: "giftcard-brand-list",
  type: "read",
  resource: "giftcard-brand",
  title: "List Gift Card Brands",
  description: "List the gift card brands and the amounts (in cents) each supports. Use a " +
    "`brand_code` and one of its `available_amounts` in Send Gift Card.",
  params: [],
  output: [{ key: "brands", type: "array", label: "Gift card brands" }],

  async execute(_input, ctx) {
    // The OpenAPI declares a bare array; the live API wraps it in `brands`. Accept both.
    const body = await new ThanksioClient(ctx).call<{ brands?: unknown[] } | unknown[]>(
      "/giftcard-brands-list",
    );
    return { brands: Array.isArray(body) ? body : body.brands ?? [] };
  },
};

export default giftcardBrandList;
