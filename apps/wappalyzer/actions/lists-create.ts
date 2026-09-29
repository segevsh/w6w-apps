import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, PATHS, toStringList, WappalyzerClient } from "../lib/client.ts";
import {
  creditsOutputFields,
  listFormatOptions,
  listSubdomainsOptions,
  matchTechnologiesOptions,
} from "../lib/params.ts";

/**
 * `POST /v2/lists/` — build a technographic lead list from technology,
 * keyword and company filters.
 *
 * Verified against `createLeadList` / `CreateListRequest` in Wappalyzer's
 * OpenAPI contract and `docs/api/v2/lists/` (fetched 2026-09-29). Creation
 * itself is free and always **asynchronous**: the response here is only
 * `{id, status: "Calculating"}` — pricing (`totalCredits`), the download
 * sample and row counts arrive later, either at Callback URL or by polling
 * `lists-get`. Spending credits to unlock the full download is a separate
 * step, `lists-finalize`.
 */
interface Input {
  technologies?: string;
  categories?: string[];
  keywords?: string[];
  languages?: string[];
  countries?: string[];
  industries?: string[];
  companySizes?: string[];
  tlds?: string[];
  matchCountryLanguage?: boolean;
  matchTechnologies?: "or" | "and" | "not";
  rootPath?: boolean;
  subset?: number;
  subsetSlice?: number;
  minAge?: number;
  maxAge?: number;
  fromDate?: number;
  requiredSets?: string[];
  subdomains?: "include" | "exclude" | "merge";
  excludeNoTraffic?: boolean;
  excludeMultilingual?: boolean;
  excludeListId?: string;
  baseListId?: string;
  sets?: string[];
  callbackUrl?: string;
  format?: "csv" | "json";
}

interface TechnologyFilter {
  slug: string;
  operator?: "=" | ">=" | "<=";
  version?: string;
}

interface CreateListAccepted {
  id: string;
  status: "Calculating";
}

const listsCreate: ActionDefinition<Input> = {
  key: "lists-create",
  type: "perform",
  resource: "list",
  title: "Create Lead List",
  description:
    "Create a lead list from technology, keyword and company filters. Free to create; the " +
    "result is priced and generated asynchronously (poll Get Lead List or use a callback URL).",
  idempotent: false,
  params: [
    {
      key: "technologies",
      label: "Technologies",
      type: "json",
      hint: 'Array of up to 50 { slug (required), operator: "="|">="|"<=", version }, e.g. ' +
        '[{"slug":"shopify"}]. Slugs come from Wappalyzer\'s technology list (JSON), linked ' +
        "from the Technologies directory.",
    },
    {
      key: "categories",
      label: "Categories",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint: "Category slugs to filter by (e.g. payment-processors). If a category has more than " +
        "50 technologies, only the top 50 are used.",
    },
    {
      key: "keywords",
      label: "Keywords",
      type: "array",
      item: { type: "string" },
      hint: 'Alphanumeric keywords, best with English nouns (e.g. fashion). Prefix with "not " ' +
        'to exclude, e.g. "not fashion".',
    },
    {
      key: "languages",
      label: "Languages",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint: "ISO 639-1 language codes, e.g. en-us.",
    },
    {
      key: "countries",
      label: "Countries",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint: "Two-letter ISO 3166-2 country codes, e.g. US.",
    },
    {
      key: "industries",
      label: "Industries",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint: "e.g. Fashion & Apparel. See Wappalyzer's list of industries.",
    },
    {
      key: "companySizes",
      label: "Company sizes",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint: "Employee-count buckets, e.g. 5000 for 1,001-5,000 employees. See Wappalyzer's list " +
        "of company sizes.",
    },
    {
      key: "tlds",
      label: "Top-level domains",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint: "e.g. .com.",
    },
    {
      key: "matchCountryLanguage",
      label: "Match both country and language",
      type: "boolean",
      advanced: true,
      hint: "Off (default) matches either. On requires both to match on the same site.",
    },
    {
      key: "matchTechnologies",
      label: "Match technologies",
      type: "select",
      options: matchTechnologiesOptions,
      advanced: true,
    },
    {
      key: "rootPath",
      label: "Root path only",
      type: "boolean",
      advanced: true,
      hint: "Only include sites that have the selected technology on the root path (typically " +
        "the homepage).",
    },
    {
      key: "subset",
      label: "Subset size",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1 },
      hint: "Limit results per technology. Combine with Subset traffic slice.",
    },
    {
      key: "subsetSlice",
      label: "Subset traffic slice",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0, max: 4 },
      hint: "0-4 for highest, high, medium, low, lowest traffic respectively (default 0). Only " +
        "matters when Subset size is smaller than the total available results.",
    },
    {
      key: "minAge",
      label: "Minimum age (months)",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0, max: 11 },
      hint: "Include results verified at least this many months ago (0-11, default 0).",
    },
    {
      key: "maxAge",
      label: "Maximum age (months)",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1, max: 12 },
      hint: "Include results verified at most this many months ago (1-12, default 3).",
    },
    {
      key: "fromDate",
      label: "Discovered after (Unix timestamp)",
      type: "number",
      advanced: true,
      hint: "Only include sites discovered after this Unix timestamp, e.g. 1620687647.",
    },
    {
      key: "requiredSets",
      label: "Required field sets",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint: "Only include results carrying these field sets, e.g. email.",
    },
    {
      key: "subdomains",
      label: "Subdomains",
      type: "select",
      options: listSubdomainsOptions,
      advanced: true,
      hint: '"Merge" combines a domain\'s own data (languages, traffic) with its subdomains ' +
        "into one result.",
    },
    {
      key: "excludeNoTraffic",
      label: "Exclude sites without traffic data",
      type: "boolean",
      advanced: true,
    },
    {
      key: "excludeMultilingual",
      label: "Exclude multilingual sites",
      type: "boolean",
      advanced: true,
    },
    {
      key: "excludeListId",
      label: "Exclude another list's URLs",
      type: "string",
      advanced: true,
      placeholder: "lst_abcdef",
      hint: "URLs in this list (recursively, through its own exclusions) are excluded from the " +
        "new one. Limited to ten lists or 500,000 sites.",
    },
    {
      key: "baseListId",
      label: "Base list",
      type: "string",
      advanced: true,
      placeholder: "lst_abcdef",
      hint: "Only include sites that are also in this list.",
    },
    {
      key: "sets",
      label: "Additional field sets",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint: 'Field sets to include in the export, e.g. email. "signals" adds technologySpend ' +
        "and trafficLevel.",
    },
    {
      key: "callbackUrl",
      label: "Callback URL",
      type: "string",
      hint: "A public endpoint on your own server, POSTed to when the list is ready to price and " +
        "finalize. Avoids polling Get Lead List.",
    },
    {
      key: "format",
      label: "Export format",
      type: "select",
      options: listFormatOptions,
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "status", type: "string", label: "Status" },
    ...creditsOutputFields,
  ],

  async execute(input, ctx) {
    const client = new WappalyzerClient(ctx);
    const body = compact({
      technologies: asOptionalJson<TechnologyFilter[]>(input.technologies, "technologies"),
      categories: toStringList(input.categories),
      keywords: toStringList(input.keywords),
      languages: toStringList(input.languages),
      countries: toStringList(input.countries),
      industries: toStringList(input.industries),
      companySizes: toStringList(input.companySizes)?.map(Number),
      tlds: toStringList(input.tlds),
      matchCountryLanguage: input.matchCountryLanguage,
      matchTechnologies: input.matchTechnologies,
      rootPath: input.rootPath,
      subset: input.subset,
      subsetSlice: input.subsetSlice,
      minAge: input.minAge,
      maxAge: input.maxAge,
      fromDate: input.fromDate,
      requiredSets: toStringList(input.requiredSets),
      subdomains: input.subdomains,
      excludeNoTraffic: input.excludeNoTraffic,
      excludeMultilingual: input.excludeMultilingual,
      excludeListId: input.excludeListId,
      baseListId: input.baseListId,
      sets: toStringList(input.sets),
      callbackUrl: input.callbackUrl,
      format: input.format,
    });

    const { data, creditsSpent, creditsRemaining } = await client.post<CreateListAccepted>(
      PATHS.lists,
      body,
    );
    return { id: data?.id, status: data?.status, creditsSpent, creditsRemaining };
  },
};

export default listsCreate;
