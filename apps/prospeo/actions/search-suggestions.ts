import type { ActionDefinition } from "@w6w/types";
import { ProspeoClient } from "../lib/client.ts";

export const SUGGESTION_FIELDS = [
  "location_search",
  "job_title_search",
  "technology_search",
  "industry_search",
  "naics_search",
  "sic_search",
  "company_operating_languages_search",
  "company_google_discovery_search",
  "company_key_customers_search",
  "company_integrations_search",
  "company_products_services_products_search",
  "company_products_services_services_search",
  "company_icp_titles_search",
  "company_icp_industries_search",
  "company_icp_geographic_markets_search",
  "company_icp_other_departments_search",
  "company_awards_search",
  "company_awards_compliance_search",
  "company_headcount_by_location_search",
  "company_funding_investors_search",
  "company_funding_accelerator_search",
  "company_website_traffic_countries_search",
] as const;

interface Input {
  field: (typeof SUGGESTION_FIELDS)[number];
  query: string;
}

const searchSuggestions: ActionDefinition<Input> = {
  key: "search-suggestions",
  type: "search",
  resource: "filter-value",
  title: "Search Filter Suggestions",
  description:
    "Look up the exact filter values Search People and Search Companies accept — locations, job titles, technologies, industries, NAICS/SIC codes and more (POST /search-suggestions). Free; 15 requests/second. Copy each value back exactly as returned.",
  params: [
    {
      key: "field",
      label: "Value to look up",
      type: "select",
      required: true,
      options: SUGGESTION_FIELDS.map((f) => ({ value: f, label: f.replace(/_search$/, "") })),
    },
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint: "At least 2 characters. NAICS/SIC accept digits (a code prefix) or text.",
    },
  ],
  output: [
    { key: "suggestions", type: "array", label: "Canonical values (locations are { name, type })" },
    { key: "field", type: "string", label: "The field that was queried" },
  ],

  async execute(input, ctx) {
    if (!SUGGESTION_FIELDS.includes(input.field)) throw new Error(`unknown field "${input.field}"`);
    if (typeof input.query !== "string" || input.query.trim().length < 2) {
      throw new Error("query must be at least 2 characters");
    }
    const body = await new ProspeoClient(ctx).call<Record<string, unknown>>("/search-suggestions", {
      body: { [input.field]: input.query.trim() },
    });
    // The response key is the request field with `_search` swapped for `_suggestions`.
    const list = body[input.field.replace(/_search$/, "_suggestions")];
    return { field: input.field, suggestions: Array.isArray(list) ? list : [] };
  },
};

export default searchSuggestions;
