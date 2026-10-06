import type { ActionDefinition } from "@w6w/types";
import { RocketReachClient } from "../lib/client.ts";
import { COMPANY_FILTERS, runSearch, searchParams } from "../lib/search.ts";
import { SEARCH_OUTPUT_TAIL } from "../lib/profile.ts";

type Input = Record<string, unknown>;

/**
 * `POST /universal/company/search` — Universal Credits accounts only. Two
 * credits per page of up to 100 results; page size defaults to 100.
 */
const universalSearchCompanies: ActionDefinition<Input> = {
  key: "universal-search-companies",
  type: "search",
  resource: "company",
  title: "Universal Search Companies",
  description: "Universal Credits version of Search Companies: charges 2 credits per page of up " +
    "to 100 results. Page size defaults to 100. Not available on Essentials, Pro or Ultimate plans.",
  params: searchParams(COMPANY_FILTERS, 100, "companies"),
  output: [
    { key: "companies", type: "array", label: "Matching companies (id, name, linkedin_url, ...)" },
    ...SEARCH_OUTPUT_TAIL,
  ],

  async execute(input, ctx) {
    const page = await runSearch(
      new RocketReachClient(ctx),
      "/universal/company/search",
      input,
      COMPANY_FILTERS,
    );
    const { items, ...rest } = page;
    return { companies: items, ...rest };
  },
};

export default universalSearchCompanies;
