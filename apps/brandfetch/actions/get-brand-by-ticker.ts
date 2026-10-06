import type { ActionDefinition } from "@w6w/types";
import { encodeSegment } from "../lib/client.ts";
import { ALLOW_NSFW_PARAM, BRAND_OUTPUT, CACHED_ONLY_PARAM, lookupBrand } from "../lib/brand.ts";

interface Input {
  ticker: string;
  allowNsfw?: string;
  cachedOnly?: boolean;
}

/** `GET /v2/brands/ticker/${encodeSegment(input.ticker)}` — the explicit ticker route. */
const action: ActionDefinition<Input> = {
  key: "get-brand-by-ticker",
  type: "read",
  resource: "brand",
  title: "Get Brand by Ticker",
  description: "Get brand data for a listed company from its stock or ETF ticker.",
  params: [
    {
      key: "ticker",
      label: "Ticker",
      type: "string",
      required: true,
      hint: "A stock or ETF ticker such as NKE.",
    },
    ALLOW_NSFW_PARAM,
    CACHED_ONLY_PARAM,
  ],
  output: [...BRAND_OUTPUT],

  async execute(input, ctx) {
    return await lookupBrand(ctx, `/v2/brands/ticker/${encodeSegment(input.ticker)}`, input);
  },
};

export default action;
