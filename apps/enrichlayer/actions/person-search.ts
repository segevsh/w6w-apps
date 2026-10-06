import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient, nextCursor } from "../lib/client.ts";

interface Input {
  country?: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  summary?: string;
  region?: string;
  city?: string;
  currentRoleTitle?: string;
  pastRoleTitle?: string;
  currentRoleBefore?: string;
  currentRoleAfter?: string;
  currentCompanyProfileUrl?: string;
  pastCompanyProfileUrl?: string;
  currentCompanyName?: string;
  pastCompanyName?: string;
  currentCompanyDomainName?: string;
  currentJobDescription?: string;
  pastJobDescription?: string;
  educationSchoolName?: string;
  educationSchoolProfileUrl?: string;
  educationDegreeName?: string;
  educationFieldOfStudy?: string;
  skills?: string;
  skillsAllInList?: string;
  languages?: string;
  interests?: string;
  industries?: string;
  groups?: string;
  currentCompanyCountry?: string;
  currentCompanyRegion?: string;
  currentCompanyCity?: string;
  currentCompanyIndustry?: string;
  currentCompanyPrimaryIndustry?: string;
  currentCompanySpecialities?: string;
  currentCompanyDescription?: string;
  currentCompanyType?: string;
  currentCompanyEmployeeCountCategory?: string;
  currentCompanyEmployeeCountMin?: number;
  currentCompanyEmployeeCountMax?: number;
  currentCompanyFollowerCountMin?: number;
  currentCompanyFollowerCountMax?: number;
  currentCompanyFoundedAfterYear?: number;
  currentCompanyFoundedBeforeYear?: number;
  currentCompanyFundingAmountMin?: number;
  currentCompanyFundingAmountMax?: number;
  currentCompanyFundingRaisedAfter?: string;
  currentCompanyFundingRaisedBefore?: string;
  followerCountMin?: number;
  followerCountMax?: number;
  publicIdentifierInList?: string;
  publicIdentifierNotInList?: string;
  pageSize?: number;
  enrichProfiles?: string;
  useCache?: string;
  nextToken?: string;
}

/** `GET /search/person` */
const personSearch: ActionDefinition<Input> = {
  key: "person-search",
  type: "search",
  resource: "person",
  title: "Search People",
  description:
    "Search the people dataset by criteria (3 credits per profile URL returned). Expressions use boolean search syntax and are limited to 255 characters each.",
  params: [
    {
      key: "country",
      label: "Country",
      type: "string",
      hint: "Alpha-2 ISO 3166 country code of the person.",
    },
    { key: "firstName", label: "First name", type: "string", hint: "Boolean search expression." },
    { key: "lastName", label: "Last name", type: "string", hint: "Boolean search expression." },
    { key: "headline", label: "Headline", type: "string", hint: "Boolean search expression." },
    { key: "summary", label: "Summary", type: "string", hint: "Boolean search expression." },
    { key: "region", label: "Region", type: "string", hint: "State, province or similar." },
    { key: "city", label: "City", type: "string" },
    {
      key: "currentRoleTitle",
      label: "Current role title",
      type: "string",
      hint: "Boolean search expression.",
    },
    {
      key: "pastRoleTitle",
      label: "Past role title",
      type: "string",
      hint: "Boolean search expression.",
    },
    {
      key: "currentRoleBefore",
      label: "Current role started before",
      type: "string",
      hint: "ISO 8601 date.",
    },
    {
      key: "currentRoleAfter",
      label: "Current role started after",
      type: "string",
      hint: "ISO 8601 date.",
    },
    { key: "currentCompanyProfileUrl", label: "Current company profile URL", type: "string" },
    { key: "pastCompanyProfileUrl", label: "Past company profile URL", type: "string" },
    {
      key: "currentCompanyName",
      label: "Current company name",
      type: "string",
      hint: "Boolean search expression.",
    },
    {
      key: "pastCompanyName",
      label: "Past company name",
      type: "string",
      hint: "Boolean search expression.",
    },
    {
      key: "currentCompanyDomainName",
      label: "Current company domain",
      type: "string",
      hint: "Boolean search expression.",
    },
    {
      key: "currentJobDescription",
      label: "Current job description",
      type: "string",
      hint: "Boolean search expression.",
    },
    {
      key: "pastJobDescription",
      label: "Past job description",
      type: "string",
      hint: "Boolean search expression.",
    },
    {
      key: "educationSchoolName",
      label: "Education: school name",
      type: "string",
      hint: "Boolean search expression.",
    },
    { key: "educationSchoolProfileUrl", label: "Education: school profile URL", type: "string" },
    {
      key: "educationDegreeName",
      label: "Education: degree",
      type: "string",
      hint: "Boolean search expression.",
    },
    {
      key: "educationFieldOfStudy",
      label: "Education: field of study",
      type: "string",
      hint: "Boolean search expression.",
    },
    {
      key: "skills",
      label: "Skills",
      type: "string",
      hint: "Boolean search expression. Cannot be combined with skills (all in list).",
    },
    {
      key: "skillsAllInList",
      label: "Skills (all in list)",
      type: "string",
      hint: "Comma-separated; every skill must match. Cannot be combined with skills.",
    },
    { key: "languages", label: "Languages", type: "string", hint: "Boolean search expression." },
    { key: "interests", label: "Interests", type: "string", hint: "Boolean search expression." },
    {
      key: "industries",
      label: "Person industry",
      type: "string",
      hint: "Inferred industry; prefer current company industry when set.",
    },
    { key: "groups", label: "Groups", type: "string", hint: "Boolean search expression." },
    {
      key: "currentCompanyCountry",
      label: "Current company country",
      type: "string",
      hint: "Alpha-2 ISO 3166 country code.",
    },
    { key: "currentCompanyRegion", label: "Current company region", type: "string" },
    { key: "currentCompanyCity", label: "Current company city", type: "string" },
    {
      key: "currentCompanyIndustry",
      label: "Current company industry",
      type: "string",
      hint: "Boolean search expression.",
    },
    {
      key: "currentCompanyPrimaryIndustry",
      label: "Current company primary industry",
      type: "string",
      hint: "Boolean search expression.",
    },
    {
      key: "currentCompanySpecialities",
      label: "Current company specialities",
      type: "string",
      hint: "Boolean search expression.",
    },
    {
      key: "currentCompanyDescription",
      label: "Current company description",
      type: "string",
      hint: "Boolean search expression.",
    },
    {
      key: "currentCompanyType",
      label: "Current company type",
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
    {
      key: "currentCompanyEmployeeCountCategory",
      label: "Current company size category",
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
    {
      key: "currentCompanyEmployeeCountMin",
      label: "Current company employees (min)",
      type: "number",
    },
    {
      key: "currentCompanyEmployeeCountMax",
      label: "Current company employees (max)",
      type: "number",
    },
    {
      key: "currentCompanyFollowerCountMin",
      label: "Current company followers (min)",
      type: "number",
    },
    {
      key: "currentCompanyFollowerCountMax",
      label: "Current company followers (max)",
      type: "number",
    },
    {
      key: "currentCompanyFoundedAfterYear",
      label: "Current company founded after (year)",
      type: "number",
    },
    {
      key: "currentCompanyFoundedBeforeYear",
      label: "Current company founded before (year)",
      type: "number",
    },
    {
      key: "currentCompanyFundingAmountMin",
      label: "Current company funding (min, USD)",
      type: "number",
    },
    {
      key: "currentCompanyFundingAmountMax",
      label: "Current company funding (max, USD)",
      type: "number",
    },
    {
      key: "currentCompanyFundingRaisedAfter",
      label: "Current company raised funding after",
      type: "string",
      hint: "ISO 8601 date.",
    },
    {
      key: "currentCompanyFundingRaisedBefore",
      label: "Current company raised funding before",
      type: "string",
      hint: "ISO 8601 date.",
    },
    { key: "followerCountMin", label: "Followers (min)", type: "number" },
    { key: "followerCountMax", label: "Followers (max)", type: "number" },
    {
      key: "publicIdentifierInList",
      label: "Public identifier in list",
      type: "string",
      hint: "Comma-separated public identifiers the person must be one of.",
    },
    {
      key: "publicIdentifierNotInList",
      label: "Public identifier not in list",
      type: "string",
      hint: "Comma-separated public identifiers the person must not be.",
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
    const res = await new EnrichLayerClient(ctx).get("/search/person", {
      country: input.country,
      first_name: input.firstName,
      last_name: input.lastName,
      headline: input.headline,
      summary: input.summary,
      region: input.region,
      city: input.city,
      current_role_title: input.currentRoleTitle,
      past_role_title: input.pastRoleTitle,
      current_role_before: input.currentRoleBefore,
      current_role_after: input.currentRoleAfter,
      current_company_profile_url: input.currentCompanyProfileUrl,
      past_company_profile_url: input.pastCompanyProfileUrl,
      current_company_name: input.currentCompanyName,
      past_company_name: input.pastCompanyName,
      current_company_domain_name: input.currentCompanyDomainName,
      current_job_description: input.currentJobDescription,
      past_job_description: input.pastJobDescription,
      education_school_name: input.educationSchoolName,
      education_school_profile_url: input.educationSchoolProfileUrl,
      education_degree_name: input.educationDegreeName,
      education_field_of_study: input.educationFieldOfStudy,
      skills: input.skills,
      skills_all_in_list: input.skillsAllInList,
      languages: input.languages,
      interests: input.interests,
      industries: input.industries,
      groups: input.groups,
      current_company_country: input.currentCompanyCountry,
      current_company_region: input.currentCompanyRegion,
      current_company_city: input.currentCompanyCity,
      current_company_industry: input.currentCompanyIndustry,
      current_company_primary_industry: input.currentCompanyPrimaryIndustry,
      current_company_specialities: input.currentCompanySpecialities,
      current_company_description: input.currentCompanyDescription,
      current_company_type: input.currentCompanyType,
      current_company_employee_count_category: input.currentCompanyEmployeeCountCategory,
      current_company_employee_count_min: input.currentCompanyEmployeeCountMin,
      current_company_employee_count_max: input.currentCompanyEmployeeCountMax,
      current_company_follower_count_min: input.currentCompanyFollowerCountMin,
      current_company_follower_count_max: input.currentCompanyFollowerCountMax,
      current_company_founded_after_year: input.currentCompanyFoundedAfterYear,
      current_company_founded_before_year: input.currentCompanyFoundedBeforeYear,
      current_company_funding_amount_min: input.currentCompanyFundingAmountMin,
      current_company_funding_amount_max: input.currentCompanyFundingAmountMax,
      current_company_funding_raised_after: input.currentCompanyFundingRaisedAfter,
      current_company_funding_raised_before: input.currentCompanyFundingRaisedBefore,
      follower_count_min: input.followerCountMin,
      follower_count_max: input.followerCountMax,
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

export default personSearch;
