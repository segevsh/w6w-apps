import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient, nextCursor } from "../lib/client.ts";

interface Input {
  country?: string;
  region?: string;
  city?: string;
  type?: string;
  name?: string;
  industry?: string;
  primaryIndustry?: string;
  specialities?: string;
  description?: string;
  domainName?: string;
  employeeCountCategory?: string;
  employeeCountMin?: number;
  employeeCountMax?: number;
  followerCountMin?: number;
  followerCountMax?: number;
  foundedAfterYear?: number;
  foundedBeforeYear?: number;
  fundingAmountMin?: number;
  fundingAmountMax?: number;
  fundingRaisedAfter?: string;
  fundingRaisedBefore?: string;
  publicIdentifierInList?: string;
  publicIdentifierNotInList?: string;
  pageSize?: number;
  enrichProfiles?: string;
  useCache?: string;
  nextToken?: string;
}

/** `GET /search/company` */
const companySearch: ActionDefinition<Input> = {
  key: "company-search",
  type: "search",
  resource: "company",
  title: "Search Companies",
  description:
    "Search the company dataset by criteria (3 credits per company URL returned). Expressions use boolean search syntax and are limited to 255 characters each.",
  params: [
    { key: "country", label: "Country", type: "string", hint: "Alpha-2 ISO 3166 country code." },
    { key: "region", label: "Region", type: "string" },
    { key: "city", label: "City", type: "string", hint: "Boolean search expression." },
    {
      key: "type",
      label: "Company type",
      type: "select",
      options: [
        { value: "EDUCATIONAL", label: "EDUCATIONAL" },
        { value: "GOVERNMENT_AGENCY", label: "GOVERNMENT_AGENCY" },
        { value: "NON_PROFIT", label: "NON_PROFIT" },
        { value: "PARTNERSHIP", label: "PARTNERSHIP" },
        { value: "PRIVATELY_HELD", label: "PRIVATELY_HELD" },
        { value: "PUBLIC_COMPANY", label: "PUBLIC_COMPANY" },
        { value: "SELF_EMPLOYED", label: "SELF_EMPLOYED" },
        { value: "SELF_OWNED", label: "SELF_OWNED" },
      ],
    },
    { key: "name", label: "Name", type: "string", hint: "Boolean search expression." },
    { key: "industry", label: "Industry", type: "string", hint: "Boolean search expression." },
    {
      key: "primaryIndustry",
      label: "Primary industry",
      type: "string",
      hint: "Boolean search expression.",
    },
    {
      key: "specialities",
      label: "Specialities",
      type: "string",
      hint: "Boolean search expression.",
    },
    {
      key: "description",
      label: "Description",
      type: "string",
      hint: "Boolean search expression.",
    },
    { key: "domainName", label: "Domain name", type: "string", hint: "Boolean search expression." },
    {
      key: "employeeCountCategory",
      label: "Size category",
      type: "select",
      hint: "Takes precedence over the min and max.",
      options: [
        { value: "custom", label: "custom" },
        { value: "startup", label: "startup" },
        { value: "small", label: "small" },
        { value: "medium", label: "medium" },
        { value: "large", label: "large" },
        { value: "enterprise", label: "enterprise" },
      ],
    },
    { key: "employeeCountMin", label: "Employees (min)", type: "number" },
    { key: "employeeCountMax", label: "Employees (max)", type: "number" },
    { key: "followerCountMin", label: "Followers (min)", type: "number" },
    { key: "followerCountMax", label: "Followers (max)", type: "number" },
    { key: "foundedAfterYear", label: "Founded after (year)", type: "number" },
    { key: "foundedBeforeYear", label: "Founded before (year)", type: "number" },
    { key: "fundingAmountMin", label: "Funding (min, USD)", type: "number" },
    { key: "fundingAmountMax", label: "Funding (max, USD)", type: "number" },
    {
      key: "fundingRaisedAfter",
      label: "Raised funding after",
      type: "string",
      hint: "ISO 8601 date.",
    },
    {
      key: "fundingRaisedBefore",
      label: "Raised funding before",
      type: "string",
      hint: "ISO 8601 date.",
    },
    {
      key: "publicIdentifierInList",
      label: "Public identifier in list",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "publicIdentifierNotInList",
      label: "Public identifier not in list",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "1 to 100 (default 100); 1 to 10 when enriching.",
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
      key: "useCache",
      label: "Cache freshness",
      type: "select",
      hint: "if-recent costs 1 to 2 extra credits per result and limits the page size to 10.",
      options: [{ value: "if-present", label: "if-present" }, {
        value: "if-recent",
        label: "if-recent",
      }],
    },
    {
      key: "nextToken",
      label: "Next-page token",
      type: "string",
      hint:
        "The `nextToken` from the previous page. The query is restored from it; only page size, enrichment and cache are honoured.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Matches (profile URL, plus profile when enriched)" },
    { key: "nextToken", type: "string", label: "Token for the next page (null on the last page)" },
    { key: "totalResultCount", type: "number", label: "Total matches" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/search/company", {
      country: input.country,
      region: input.region,
      city: input.city,
      type: input.type,
      name: input.name,
      industry: input.industry,
      primary_industry: input.primaryIndustry,
      specialities: input.specialities,
      description: input.description,
      domain_name: input.domainName,
      employee_count_category: input.employeeCountCategory,
      employee_count_min: input.employeeCountMin,
      employee_count_max: input.employeeCountMax,
      follower_count_min: input.followerCountMin,
      follower_count_max: input.followerCountMax,
      founded_after_year: input.foundedAfterYear,
      founded_before_year: input.foundedBeforeYear,
      funding_amount_min: input.fundingAmountMin,
      funding_amount_max: input.fundingAmountMax,
      funding_raised_after: input.fundingRaisedAfter,
      funding_raised_before: input.fundingRaisedBefore,
      public_identifier_in_list: input.publicIdentifierInList,
      public_identifier_not_in_list: input.publicIdentifierNotInList,
      page_size: input.pageSize,
      enrich_profiles: input.enrichProfiles,
      use_cache: input.useCache,
      next_token: input.nextToken,
    });
    return {
      results: (res as { results?: unknown[] }).results ?? [],
      nextToken: nextCursor((res as { next_page?: string | null }).next_page, "next_token"),
      totalResultCount: (res as { total_result_count?: number }).total_result_count ?? null,
    };
  },
};

export default companySearch;
