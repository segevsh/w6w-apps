import type { ActionDefinition } from "@w6w/types";
import { encodeSegment } from "../lib/client.ts";
import { ALLOW_NSFW_PARAM, BRAND_OUTPUT, CACHED_ONLY_PARAM, lookupBrand } from "../lib/brand.ts";

interface Input {
  symbol: string;
  allowNsfw?: string;
  cachedOnly?: boolean;
}

/** `GET /v2/brands/crypto/${encodeSegment(input.symbol)}` — the explicit crypto route. */
const action: ActionDefinition<Input> = {
  key: "get-brand-by-crypto",
  type: "read",
  resource: "brand",
  title: "Get Brand by Crypto Symbol",
  description: "Get brand data for a cryptocurrency from its symbol.",
  params: [
    {
      key: "symbol",
      label: "Symbol",
      type: "string",
      required: true,
      hint: "A crypto symbol such as BTC or ETH.",
    },
    ALLOW_NSFW_PARAM,
    CACHED_ONLY_PARAM,
  ],
  output: [...BRAND_OUTPUT],

  async execute(input, ctx) {
    return await lookupBrand(ctx, `/v2/brands/crypto/${encodeSegment(input.symbol)}`, input);
  },
};

export default action;
