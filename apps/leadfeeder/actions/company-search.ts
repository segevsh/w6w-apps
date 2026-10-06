import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, LeadfeederClient, reply, strList } from "../lib/client.ts";
import {
  accountIdParam,
  cursorParam,
  dataOutput,
  metaOutput,
  nextCursorOutput,
  pageSizeParam,
} from "../lib/params.ts";

interface Input {
  accountId: string;
  searchTerms?: unknown;
  industries?: unknown;
  locations?: unknown;
  employeeRanges?: unknown;
  revenueMin?: number;
  revenueMax?: number;
  icpIds?: unknown;
  filters?: unknown;
  cursor?: string;
  pageSize?: number;
}

/** `POST /v1/companies/search` — verified against the vendor OpenAPI document (2026-10-06). */
const companySearch: ActionDefinition<Input> = {
  key: "company-search",
  type: "search",
  resource: "company",
  title: "Search Companies",
  description:
    "Search the global company database by terms, industry, revenue, location or ICP. Consumes credits (see `meta.credits.charged`); cursor-paged.",
  params: [
    accountIdParam,
    {
      key: "searchTerms",
      label: "Search terms",
      type: "json",
      hint: "Array or comma-separated text matched against company names.",
    },
    {
      key: "industries",
      label: "Industries",
      type: "json",
      hint:
        '`{"classification":"nace","codes":["62"]}`; classification is `wz`, `nace` or `internal`.',
    },
    {
      key: "locations",
      label: "Locations",
      type: "json",
      hint: '`[{"country_code":"DE","city":"Berlin"}]`',
    },
    {
      key: "employeeRanges",
      label: "Employee ranges",
      type: "json",
      hint: "Array of range strings, exactly as the vendor documents them.",
    },
    { key: "revenueMin", label: "Minimum revenue", type: "number" },
    { key: "revenueMax", label: "Maximum revenue", type: "number" },
    {
      key: "icpIds",
      label: "ICP IDs",
      type: "json",
      hint: "Array or comma-separated ideal-customer-profile ids.",
    },
    {
      key: "filters",
      label: "Filters",
      type: "json",
      hint:
        '`{"has_email":true,"has_phone":true,"do_not_contact":false}` \u2014 also `has_ip_addresses`, `has_financials_revenue`, \u2026',
    },
    cursorParam,
    pageSizeParam,
  ],
  output: [
    dataOutput,
    metaOutput,
    nextCursorOutput,
  ],

  async execute(input, ctx) {
    const path = "/v1/companies/search";
    const query = {
      account_id: input.accountId,
      "page[cursor]": input.cursor,
      "page[size]": input.pageSize,
    };
    const revenue = compact({ min: input.revenueMin, max: input.revenueMax });
    const body = compact({
      search_terms: strList(input.searchTerms),
      industries: jsonValue(input.industries),
      locations: jsonValue(input.locations),
      employee_ranges: jsonValue(input.employeeRanges),
      revenue: Object.keys(revenue).length > 0 ? revenue : undefined,
      icp_ids: strList(input.icpIds),
      filters: jsonValue(input.filters),
    });
    return reply(await new LeadfeederClient(ctx).request("POST", path, { query, body }));
  },
};

export default companySearch;
