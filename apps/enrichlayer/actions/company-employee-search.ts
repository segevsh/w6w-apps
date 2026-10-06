import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient, nextCursor } from "../lib/client.ts";

interface Input {
  companyProfileUrl: string;
  keywordBoolean: string;
  pageSize?: number;
  country?: string;
  enrichProfiles?: string;
  resolveNumericId?: string;
}

/** `GET /company/employee/search/` */
const companyEmployeeSearch: ActionDefinition<Input> = {
  key: "company-employee-search",
  type: "search",
  resource: "company",
  title: "Search Company Employees by Title",
  description:
    "Search a company's employees by job title keywords (10 credits plus per-result charges).",
  params: [
    { key: "companyProfileUrl", label: "Company profile URL", type: "string", required: true },
    {
      key: "keywordBoolean",
      label: "Job title keywords (boolean search)",
      type: "string",
      required: true,
      hint: "Max 255 characters, for example ceo OR cto.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "1 to 9999 (default 10); 1 to 10 when enriching.",
    },
    {
      key: "country",
      label: "Country",
      type: "string",
      hint: "Alpha-2 code. Costs 3 extra credits per result.",
    },
    {
      key: "enrichProfiles",
      label: "Enrich profiles",
      type: "select",
      hint:
        "enrich returns full profiles instead of profile URLs, 1 extra credit per result, and caps the page size at 10.",
      options: [{ value: "skip", label: "skip" }, { value: "enrich", label: "enrich" }],
    },
    {
      key: "resolveNumericId",
      label: "Resolve numeric company IDs",
      type: "select",
      hint: "true costs 2 extra credits.",
      options: [{ value: "false", label: "false" }, { value: "true", label: "true" }],
    },
  ],
  output: [
    {
      key: "employees",
      type: "array",
      label: "Employees (profile URL, plus profile when enriched)",
    },
    {
      key: "nextCursor",
      type: "string",
      label: "Cursor for the next page, when the response carries one",
    },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/company/employee/search/", {
      company_profile_url: input.companyProfileUrl,
      keyword_boolean: input.keywordBoolean,
      page_size: input.pageSize,
      country: input.country,
      enrich_profiles: input.enrichProfiles,
      resolve_numeric_id: input.resolveNumericId,
    });
    return {
      employees: (res as { employees?: unknown[] }).employees ?? [],
      nextCursor: nextCursor((res as { next_page?: string | null }).next_page, "after"),
    };
  },
};

export default companyEmployeeSearch;
