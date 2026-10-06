import type { ActionDefinition } from "@w6w/types";
import { encodeSegment } from "../lib/client.ts";
import { ALLOW_NSFW_PARAM, BRAND_OUTPUT, CACHED_ONLY_PARAM, lookupBrand } from "../lib/brand.ts";

interface Input {
  domain: string;
  allowNsfw?: string;
  cachedOnly?: boolean;
}

/** `GET /v2/brands/domain/${encodeSegment(input.domain)}` — the explicit domain route. */
const action: ActionDefinition<Input> = {
  key: "get-brand-by-domain",
  type: "read",
  resource: "brand",
  title: "Get Brand by Domain",
  description:
    "Get brand data for a domain, with no ticker or crypto-symbol ambiguity. Email addresses and website URLs are refused by this route; use Get Brand for those.",
  params: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      hint: "A bare domain such as nike.com.",
    },
    ALLOW_NSFW_PARAM,
    CACHED_ONLY_PARAM,
  ],
  output: [...BRAND_OUTPUT],

  async execute(input, ctx) {
    return await lookupBrand(ctx, `/v2/brands/domain/${encodeSegment(input.domain)}`, input);
  },
};

export default action;
