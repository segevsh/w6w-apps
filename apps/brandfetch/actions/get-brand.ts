import type { ActionDefinition } from "@w6w/types";
import { encodeSegment } from "../lib/client.ts";
import { ALLOW_NSFW_PARAM, BRAND_OUTPUT, CACHED_ONLY_PARAM, lookupBrand } from "../lib/brand.ts";

interface Input {
  identifier: string;
  allowNsfw?: string;
  cachedOnly?: boolean;
}

/** `GET /v2/brands/${encodeSegment(input.identifier)}` — the generic Brand API lookup. */
const action: ActionDefinition<Input> = {
  key: "get-brand",
  type: "read",
  resource: "brand",
  title: "Get Brand",
  description:
    "Get a brand's logos, colors, fonts, imagery, links and company data from a domain, website URL, email address, brand ID, ticker, ISIN or crypto symbol. Billed per call (a 404 too).",
  params: [
    {
      key: "identifier",
      label: "Identifier",
      type: "string",
      required: true,
      hint:
        "A domain (nike.com), website URL, email address, brand ID (id_0dwKPKT), ticker (NKE), ISIN or crypto symbol (BTC). The vendor resolves it in the order domain, ticker, ISIN, crypto; use the explicit actions to avoid a collision.",
    },
    ALLOW_NSFW_PARAM,
    CACHED_ONLY_PARAM,
  ],
  output: [...BRAND_OUTPUT],

  async execute(input, ctx) {
    return await lookupBrand(ctx, `/v2/brands/${encodeSegment(input.identifier)}`, input);
  },
};

export default action;
