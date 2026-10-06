import type { ActionDefinition } from "@w6w/types";
import { compact, requireObject, WizaClient } from "../lib/client.ts";

interface Input {
  filters?: unknown;
  pageToken?: string;
  size?: number;
}

const searchCompanies: ActionDefinition<Input> = {
  key: "search-companies",
  type: "search",
  resource: "company",
  title: "Search Companies",
  description:
    "Search companies by firmographic, location, growth and funding filters (POST /api/accounts/search). Send `filters` to start a search, or only the `pageToken` from the previous response (no filters) to fetch the next page. Every returned company costs 0.5 API credits; `size` defaults to 0 (count only), and the usual maximum is 30. An empty-credit account is a 400 and fails the action; the rate limit is a 429.",
  params: [
    {
      key: "filters",
      label: "Filters",
      type: "json",
      hint:
        'Required for a new search, forbidden with a page token. e.g. {"company_industry":["Computer Software"],"company_size":["51-200"],"company_location":[{"v":"Canada","b":"country","s":"i"}]}. Filters: company_id, company_linkedin_id, company_summary, company_location, company_radius, company_industry, naics_code, sic_code, company_type, company_size, technologies, company_annual_growth, department_size, year_founded_start/end, revenue, funding_date, last_funding_min/max, funding_min/max, funding_stage, funding_type.',
    },
    {
      key: "pageToken",
      label: "Page token",
      type: "string",
      hint: "`next_page_token` from the previous response. Send it without filters.",
    },
    {
      key: "size",
      label: "Size",
      type: "number",
      hint: "Companies to return (0 = count only for a new search; at least 1 with a page token).",
      validation: { min: 0, integer: true },
    },
  ],
  output: [
    { key: "total", type: "number", label: "Companies matching the filters" },
    { key: "companies", type: "array", label: "Companies returned" },
    { key: "next_page_token", type: "string", label: "Token for the next page, or null" },
    { key: "credits", type: "object", label: "API credits charged" },
  ],

  async execute(input, ctx) {
    const hasFilters = input.filters !== undefined && input.filters !== null &&
      input.filters !== "";
    const hasToken = typeof input.pageToken === "string" && input.pageToken !== "";
    if (hasFilters === hasToken) {
      throw new Error("send either filters (a new search) or pageToken (the next page), not both");
    }
    let payload: Record<string, unknown>;
    if (hasToken) {
      if (input.size !== undefined && input.size < 1) {
        throw new Error("size must be at least 1 when fetching a page");
      }
      payload = compact({ page_token: input.pageToken, size: input.size });
    } else {
      payload = compact({ filters: requireObject(input.filters, "filters"), size: input.size });
    }
    const body = await new WizaClient(ctx).call<
      {
        data?: {
          total?: number;
          companies?: unknown[];
          next_page_token?: string | null;
          credits?: unknown;
        };
      }
    >("/api/accounts/search", { method: "POST", body: payload });
    const data = body.data ?? {};
    return {
      total: data.total ?? 0,
      companies: data.companies ?? [],
      next_page_token: data.next_page_token ?? null,
      credits: data.credits ?? null,
    };
  },
};

export default searchCompanies;
