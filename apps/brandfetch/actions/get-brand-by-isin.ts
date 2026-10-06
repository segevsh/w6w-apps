import type { ActionDefinition } from "@w6w/types";
import { encodeSegment } from "../lib/client.ts";
import { ALLOW_NSFW_PARAM, BRAND_OUTPUT, CACHED_ONLY_PARAM, lookupBrand } from "../lib/brand.ts";

interface Input {
  isin: string;
  allowNsfw?: string;
  cachedOnly?: boolean;
}

/** `GET /v2/brands/isin/${encodeSegment(input.isin)}` — the explicit ISIN route. */
const action: ActionDefinition<Input> = {
  key: "get-brand-by-isin",
  type: "read",
  resource: "brand",
  title: "Get Brand by ISIN",
  description: "Get brand data for a listed company from its ISIN.",
  params: [
    {
      key: "isin",
      label: "ISIN",
      type: "string",
      required: true,
      hint: "An ISIN such as US6541061031.",
    },
    ALLOW_NSFW_PARAM,
    CACHED_ONLY_PARAM,
  ],
  output: [...BRAND_OUTPUT],

  async execute(input, ctx) {
    return await lookupBrand(ctx, `/v2/brands/isin/${encodeSegment(input.isin)}`, input);
  },
};

export default action;
