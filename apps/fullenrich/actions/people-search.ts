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
  titles?: string[] | string;
  seniorityLevels?: string[] | string;
  jobFunctions?: string[] | string;
  locations?: string[] | string;
  companyNames?: string[] | string;
  companyDomains?: string[] | string;
  filters?: unknown;
  limit?: number;
  offset?: number;
  searchAfter?: string;
}

/** `POST /people/search` — synchronous; 0.25 credit per person returned. */
const peopleSearch: ActionDefinition<Input> = {
  key: "people-search",
  type: "search",
  resource: "people",
  title: "Search People",
  description:
    "Search people by job title, seniority, function, location and company. Filters are ANDed. Synchronous; costs 0.25 credit per person returned.",
  params: [
    { key: "titles", label: "Job titles", type: "array", item: { type: "string" } },
    {
      key: "seniorityLevels",
      label: "Seniority levels",
      type: "array",
      item: { type: "string" },
      hint: "e.g. Owner, Founder, C-level, Partner, VP, Head, Director, Senior, Manager.",
    },
    { key: "jobFunctions", label: "Job functions", type: "array", item: { type: "string" } },
    {
      key: "locations",
      label: "Person locations",
      type: "array",
      item: { type: "string" },
      hint: "City, region or country.",
    },
    {
      key: "companyNames",
      label: "Current company names",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "companyDomains",
      label: "Current company domains",
      type: "array",
      item: { type: "string" },
    },
    FILTERS_PARAM,
    ...PAGING_PARAMS,
  ],
  output: [
    { key: "people", type: "array", label: "Matching people" },
    { key: "total", type: "number", label: "Total matches" },
    { key: "credits", type: "number", label: "Credits consumed" },
    { key: "searchAfter", type: "string", label: "Cursor for the next page" },
  ],

  async execute(input, ctx) {
    const body = compact({
      ...mergeFilters(input.filters, {
        current_position_titles: valueFilter(input.titles),
        current_position_seniority_level: valueFilter(input.seniorityLevels),
        current_position_job_functions: valueFilter(input.jobFunctions),
        person_locations: valueFilter(input.locations),
        current_company_names: valueFilter(input.companyNames),
        current_company_domains: valueFilter(input.companyDomains),
      }),
      ...paging(input),
    });
    const res = await new FullEnrichClient(ctx).request<
      { people?: unknown[]; metadata?: SearchMetadata }
    >("POST", "/people/search", { body });
    return {
      people: res.people ?? [],
      total: res.metadata?.total ?? null,
      credits: res.metadata?.credits ?? null,
      searchAfter: res.metadata?.search_after ?? null,
    };
  },
};

export default peopleSearch;
