import type { ActionDefinition } from "@w6w/types";
import { compact, SeamlessClient, toInt, toList, toObject } from "../lib/client.ts";

/** `POST /api/client/v2/search/companies` — Search Companies. */
interface Input {
  companyName?: unknown;
  companyNameSearchType?: string;
  companyDomain?: unknown;
  locations?: unknown;
  companyCountry?: unknown;
  companyState?: unknown;
  industry?: unknown;
  companySize?: unknown;
  companyRevenue?: unknown;
  technologies?: unknown;
  technologiesIsOr?: boolean;
  companyKeyword?: unknown;
  companyType?: string;
  newsTypes?: unknown;
  savedSearchId?: number;
  limit?: number;
  page?: number;
  nextToken?: string;
  filters?: unknown;
}

const companiesSearch: ActionDefinition<Input> = {
  key: "companies-search",
  type: "search",
  resource: "company",
  title: "Search Companies",
  description:
    "Search the Seamless.AI company database by name, domain, location, size, revenue, funding and more. Spends credits: the vendor bills search results against your Seamless.AI credit balance.",
  params: [
    {
      key: "companyName",
      label: "Company names",
      type: "json",
      hint: "A JSON array, or comma / newline separated values.",
    },
    {
      key: "companyNameSearchType",
      label: "Company name matching",
      type: "select",
      options: [{ value: "default", label: "default" }, { value: "related", label: "related" }, {
        value: "exact",
        label: "exact",
      }],
    },
    {
      key: "companyDomain",
      label: "Company domains",
      type: "json",
      hint: "A JSON array, or comma / newline separated values.",
    },
    {
      key: "locations",
      label: "Locations",
      type: "json",
      hint:
        "Free-form city / region / country; prefix a value with - to exclude it. See locations-lookup.",
    },
    {
      key: "companyCountry",
      label: "Countries",
      type: "json",
      hint: "A JSON array, or comma / newline separated values.",
    },
    {
      key: "companyState",
      label: "States / regions",
      type: "json",
      hint: "A JSON array, or comma / newline separated values.",
    },
    { key: "industry", label: "Industries", type: "json", hint: "Vendor industry names, up to 5." },
    {
      key: "companySize",
      label: "Company size",
      type: "multiselect",
      options: [
        { value: "0 - 1 (Self-employed)", label: "0 - 1 (Self-employed)" },
        { value: "2 - 10", label: "2 - 10" },
        { value: "11 - 50", label: "11 - 50" },
        { value: "51 - 200", label: "51 - 200" },
        { value: "201 - 500", label: "201 - 500" },
        { value: "501 - 1,000", label: "501 - 1,000" },
        { value: "1,001 - 5,000", label: "1,001 - 5,000" },
        { value: "5,001 - 10,000", label: "5,001 - 10,000" },
        { value: "10,001+", label: "10,001+" },
      ],
      hint: "A JSON array, or comma / newline separated values.",
    },
    {
      key: "companyRevenue",
      label: "Company revenue",
      type: "multiselect",
      options: [
        { value: "$0 - $100K", label: "$0 - $100K" },
        { value: "$100K - $1M", label: "$100K - $1M" },
        { value: "$1M - $5M", label: "$1M - $5M" },
        { value: "$5M - $20M", label: "$5M - $20M" },
        { value: "$20M - $50M", label: "$20M - $50M" },
        { value: "$50M - $100M", label: "$50M - $100M" },
        { value: "$100M - $500M", label: "$100M - $500M" },
        { value: "$500M - $1B", label: "$500M - $1B" },
        { value: "$1B+", label: "$1B+" },
      ],
      hint: "A JSON array, or comma / newline separated values.",
    },
    {
      key: "technologies",
      label: "Technologies used",
      type: "json",
      hint: "A JSON array, or comma / newline separated values.",
    },
    {
      key: "technologiesIsOr",
      label: "Technologies: match any",
      type: "boolean",
      hint: "True matches any listed technology, false requires all.",
    },
    {
      key: "companyKeyword",
      label: "Keywords",
      type: "json",
      hint: "A JSON array, or comma / newline separated values.",
    },
    {
      key: "companyType",
      label: "Company type",
      type: "select",
      options: [{ value: "Public", label: "Public" }, { value: "Private", label: "Private" }],
    },
    {
      key: "newsTypes",
      label: "Company news types",
      type: "multiselect",
      options: [
        { value: "Acquisition", label: "Acquisition" },
        { value: "Corporate Challenges", label: "Corporate Challenges" },
        { value: "Cost Cutting", label: "Cost Cutting" },
        { value: "Expansion", label: "Expansion" },
        { value: "Investment", label: "Investment" },
        { value: "Leadership", label: "Leadership" },
        { value: "Partnership", label: "Partnership" },
        { value: "Recognition", label: "Recognition" },
      ],
      hint: "A JSON array, or comma / newline separated values.",
    },
    {
      key: "savedSearchId",
      label: "Saved search ID",
      type: "number",
      validation: { integer: true },
      hint: "Run a saved search's filters instead; cannot be combined with other filters.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 500 },
      hint: "Maximum results to return. Values above 500 are capped by the vendor.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Page number, starting at 1.",
    },
    {
      key: "nextToken",
      label: "Next token",
      type: "string",
      hint: "`supplementalData.nextToken` from the previous page; takes precedence over page.",
    },
    {
      key: "filters",
      label: "Other filters",
      type: "json",
      hint:
        "A JSON object of any other search filter the vendor documents (merged into the request body; the named fields above win on conflict).",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Matching companies, each with a searchResultId" },
    { key: "supplementalData", type: "object", label: "isMore, total, perPage and nextToken" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("POST", "/search/companies", {
      body: compact({
        ...toObject(input.filters, "Other filters"),
        companyName: toList(input.companyName),
        companyNameSearchType: input.companyNameSearchType,
        companyDomain: toList(input.companyDomain),
        locations: toList(input.locations),
        companyCountry: toList(input.companyCountry),
        companyState: toList(input.companyState),
        industry: toList(input.industry),
        companySize: toList(input.companySize),
        companyRevenue: toList(input.companyRevenue),
        technologies: toList(input.technologies),
        technologiesIsOr: input.technologiesIsOr,
        companyKeyword: toList(input.companyKeyword),
        companyType: input.companyType,
        newsTypes: toList(input.newsTypes),
        savedSearchId: toInt(input.savedSearchId, "Saved search ID"),
        limit: toInt(input.limit, "Limit"),
        page: toInt(input.page, "Page"),
        nextToken: input.nextToken,
      }),
    });
  },
};

export default companiesSearch;
