import type { ActionDefinition } from "@w6w/types";
import { RocketReachClient } from "../lib/client.ts";
import { COMPANY_FILTERS, runSearch, searchParams } from "../lib/search.ts";
import { SEARCH_OUTPUT_TAIL } from "../lib/profile.ts";

type Input = Record<string, unknown>;

/**
 * `POST /searchCompany`. Returns company summaries (id, name, email domain,
 * ticker, industry, location); firmographics come from Lookup Company.
 */
const searchCompanies: ActionDefinition<Input> = {
  key: "search-companies",
  type: "search",
  resource: "company",
  title: "Search Companies",
  description: "Search RocketReach's 60M+ companies by name, domain, industry, location, size, " +
    "revenue and tech stack. Returns company summaries; use Lookup Company for the full " +
    "profile. Page with Start. For Universal Credits accounts use Universal Search Companies.",
  params: searchParams(COMPANY_FILTERS, 10, "companies"),
  output: [
    { key: "companies", type: "array", label: "Matching companies (id, name, email_domain, ...)" },
    ...SEARCH_OUTPUT_TAIL,
  ],

  async execute(input, ctx) {
    const page = await runSearch(
      new RocketReachClient(ctx),
      "/searchCompany",
      input,
      COMPANY_FILTERS,
    );
    const { items, ...rest } = page;
    return { companies: items, ...rest };
  },
};

export default searchCompanies;
