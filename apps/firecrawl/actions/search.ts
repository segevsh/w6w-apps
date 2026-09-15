import type { ActionDefinition } from "@w6w/types";
import { FirecrawlClient } from "../lib/client.ts";
import { buildFormats, toList } from "../lib/params.ts";

/**
 * `POST /search` — run a web search, optionally scraping each result too.
 *
 * ## Also works with no credential at all
 *
 * Measured live on 2026-09-15: `{"query": "firecrawl web scraping"}` with no
 * `Authorization` header answered `200` with real results. See
 * `auth/api-key.ts` — the same "keyless tier proves nothing about the key"
 * caveat applies here as it does to `scrape`.
 *
 * `sources` controls which result arrays come back (`web`, `images`, `news` —
 * the response key names match). Only `web` results carry the optional
 * `formats`-driven page content; images and news results are metadata only.
 */
interface Input {
  query: string;
  limit?: number;
  sources?: string[] | string;
  country?: string;
  tbs?: string;
  includeDomains?: string;
  excludeDomains?: string;
  formats?: string[] | string;
}

const search: ActionDefinition<Input> = {
  key: "search",
  type: "search",
  resource: "web",
  title: "Search the Web",
  description: "Run a web search and get back results, optionally with each page's content.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      validation: { maxLength: 500 },
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 10,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Per source type, when more than one is selected.",
    },
    {
      key: "sources",
      label: "Sources",
      type: "multiselect",
      options: [
        { value: "web", label: "Web (default)" },
        { value: "images", label: "Images" },
        { value: "news", label: "News" },
      ],
    },
    {
      key: "country",
      label: "Country",
      type: "string",
      default: "US",
      hint: "ISO country code for geo-targeting, e.g. `US`.",
    },
    {
      key: "tbs",
      label: "Time range",
      type: "string",
      hint: "`qdr:h`/`d`/`w`/`m`/`y` for the last hour/day/week/month/year, or a custom range " +
        "`cdr:1,cd_min:MM/DD/YYYY,cd_max:MM/DD/YYYY`.",
    },
    {
      key: "includeDomains",
      label: "Include domains",
      type: "string",
      hint: "Comma-separated hostnames. Cannot be combined with Exclude domains.",
    },
    {
      key: "excludeDomains",
      label: "Exclude domains",
      type: "string",
      hint: "Comma-separated hostnames. Cannot be combined with Include domains.",
    },
    {
      key: "formats",
      label: "Scrape formats",
      type: "multiselect",
      options: [
        { value: "markdown", label: "Markdown" },
        { value: "links", label: "Links" },
      ],
      hint: "Leave empty to return search metadata only, with no page content fetched.",
    },
  ],
  output: [
    { key: "web", type: "array", label: "Web results" },
    { key: "images", type: "array", label: "Image results" },
    { key: "news", type: "array", label: "News results" },
  ],

  execute(input, ctx) {
    ctx.log("info", "searching", { query: input.query });
    const sources = toList(input.sources);
    const formats = buildFormats(input.formats);
    return new FirecrawlClient(ctx).data("/search", {
      method: "POST",
      body: {
        query: input.query,
        limit: input.limit,
        sources: sources?.map((type) => ({ type })),
        country: input.country,
        tbs: input.tbs,
        includeDomains: toList(input.includeDomains),
        excludeDomains: toList(input.excludeDomains),
        ...(formats ? { scrapeOptions: { formats } } : {}),
      },
    });
  },
};

export default search;
