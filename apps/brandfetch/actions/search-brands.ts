import type { ActionDefinition } from "@w6w/types";
import { BrandfetchClient, encodeSegment } from "../lib/client.ts";

interface Input {
  name: string;
}

interface SearchHit {
  brandId?: string;
  name?: string | null;
  domain?: string;
  icon?: string | null;
  claimed?: boolean;
  qualityScore?: number;
  verified?: boolean;
}

/**
 * `GET /v2/search/{name}` — the Brand Search API. The spec requires a `c` query
 * parameter (a Brand Search client ID); the Auth `sign` hook adds it when the
 * connection holds one. Measured 2026-10-06: the endpoint also answers 200
 * without `c` or with a made-up one, and does not need the bearer key.
 * The live response carries `qualityScore` and `verified`, which the spec omits.
 */
const searchBrands: ActionDefinition<Input> = {
  key: "search-brands",
  type: "search",
  resource: "brand",
  title: "Search Brands",
  description: "Search brands by company name; returns the brand ID, name, domain and icon of " +
    "each match, best first. Feed a hit's domain to Get Brand for the full profile.",
  params: [
    { key: "name", label: "Company name", type: "string", required: true, hint: "e.g. Nike" },
  ],
  output: [
    { key: "count", type: "number", label: "Number of matches" },
    { key: "brands", type: "array", label: "Matches: brandId, name, domain, icon, claimed" },
  ],

  async execute(input, ctx) {
    const result = await new BrandfetchClient(ctx).request(
      `/v2/search/${encodeSegment(input.name)}`,
    );
    const hits = Array.isArray(result.body) ? result.body as SearchHit[] : [];
    const brands = hits.map((h) => ({
      brandId: h.brandId,
      name: h.name ?? null,
      domain: h.domain,
      icon: h.icon ?? null,
      claimed: h.claimed,
      qualityScore: h.qualityScore,
      verified: h.verified,
    }));
    return { count: brands.length, brands };
  },
};

export default searchBrands;
