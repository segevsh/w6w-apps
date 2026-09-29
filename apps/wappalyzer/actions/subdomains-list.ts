import type { ActionDefinition } from "@w6w/types";
import { joinList, PATHS, WappalyzerClient } from "../lib/client.ts";
import { creditsOutputFields } from "../lib/params.ts";

/**
 * `GET /v2/subdomains/` — website-serving subdomains for up to ten domains,
 * from Wappalyzer's dataset of millions of active websites.
 *
 * Verified against `lookupSubdomains` in Wappalyzer's OpenAPI contract and
 * `docs/api/v2/subdomains/` (fetched 2026-09-29). This is discovery over a
 * dataset, not a live DNS walk — the vendor's own docs say results "mainly
 * include subdomains that serve website content" and "some subdomains may be
 * missing or no longer resolve."
 */
interface Input {
  domains: string;
  limit?: number;
  after?: string;
}

const subdomainsList: ActionDefinition<Input> = {
  key: "subdomains-list",
  type: "search",
  resource: "subdomain",
  title: "Discover Subdomains",
  description: "Discover website-serving subdomains for up to ten domains.",
  params: [
    {
      key: "domains",
      label: "Domains",
      type: "string",
      required: true,
      hint: "Between one and ten domain names, comma separated (e.g. example.com,example.org).",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 10 },
      hint: "Maximum results to return. Must be a multiple of 10.",
    },
    {
      key: "after",
      label: "Resume after",
      type: "string",
      advanced: true,
      hint: "Pass the moreAfter value from a previous result to fetch the next page.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Per-domain subdomain results" },
    ...creditsOutputFields,
  ],

  async execute(input, ctx) {
    const client = new WappalyzerClient(ctx);
    const { data, creditsSpent, creditsRemaining } = await client.get<unknown[]>(
      PATHS.subdomains,
      { domains: joinList(input.domains), limit: input.limit, after: input.after },
    );
    return { results: data ?? [], creditsSpent, creditsRemaining };
  },
};

export default subdomainsList;
