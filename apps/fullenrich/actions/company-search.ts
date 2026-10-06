import type { ActionDefinition } from "@w6w/types";
import { compact, FullEnrichClient } from "../lib/client.ts";
import {
  FILTERS_PARAM,
  mergeFilters,
  paging,
  PAGING_PARAMS,
  type SearchMetadata,
  valueFilter,
} from "../lib/search.ts";

interface Input {
  names?: string[] | string;
  domains?: string[] | string;
  industries?: string[] | string;
  keywords?: string[] | string;
  headquartersLocations?: string[] | string;
  filters?: unknown;
  limit?: number;
  offset?: number;
  searchAfter?: string;
}

/** `POST /company/search` — synchronous; 0.25 credit per company returned. */
const companySearch: ActionDefinition<Input> = {
  key: "company-search",
  type: "search",
  resource: "company",
  title: "Search Companies",
  description:
    "Search companies by name, domain, industry, keyword and headquarters location. Filters are ANDed. Synchronous; costs 0.25 credit per company returned.",
  params: [
    { key: "names", label: "Company names", type: "array", item: { type: "string" } },
    { key: "domains", label: "Domains", type: "array", item: { type: "string" } },
    { key: "industries", label: "Industries", type: "array", item: { type: "string" } },
    { key: "keywords", label: "Keywords", type: "array", item: { type: "string" } },
    {
      key: "headquartersLocations",
      label: "Headquarters locations",
      type: "array",
      item: { type: "string" },
    },
    FILTERS_PARAM,
    ...PAGING_PARAMS,
  ],
  output: [
    { key: "companies", type: "array", label: "Matching companies" },
    { key: "total", type: "number", label: "Total matches" },
    { key: "credits", type: "number", label: "Credits consumed" },
    { key: "searchAfter", type: "string", label: "Cursor for the next page" },
  ],

  async execute(input, ctx) {
    const body = compact({
      ...mergeFilters(input.filters, {
        names: valueFilter(input.names),
        domains: valueFilter(input.domains),
        industries: valueFilter(input.industries),
        keywords: valueFilter(input.keywords),
        headquarters_locations: valueFilter(input.headquartersLocations),
      }),
      ...paging(input),
    });
    const res = await new FullEnrichClient(ctx).request<
      { companies?: unknown[]; metadata?: SearchMetadata }
    >("POST", "/company/search", { body });
    return {
      companies: res.companies ?? [],
      total: res.metadata?.total ?? null,
      credits: res.metadata?.credits ?? null,
      searchAfter: res.metadata?.search_after ?? null,
    };
  },
};

export default companySearch;
