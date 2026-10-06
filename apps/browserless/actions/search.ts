import type { ActionDefinition } from "@w6w/types";
import { BrowserlessClient, compact } from "../lib/client.ts";
import { buildQuery, type QueryInput, queryParams } from "../lib/params.ts";

interface Input extends QueryInput {
  query: string;
  limit?: number;
  lang?: string;
  country?: string;
  location?: string;
  tbs?: string;
  sources?: string[];
  categories?: string[];
  scrapeFormats?: string[];
  onlyMainContent?: boolean;
}

const search: ActionDefinition<Input> = {
  key: "search",
  type: "read",
  resource: "search",
  title: "Search the Web",
  description:
    "Search the web and optionally scrape every result page into markdown, HTML, links or screenshots.",
  params: [
    { key: "query", label: "Query", type: "string", required: true },
    {
      key: "limit",
      label: "Results per source",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Default 10, capped by your plan.",
    },
    { key: "lang", label: "Language", type: "string", placeholder: "en" },
    { key: "country", label: "Country (ISO 3166-1 alpha-2)", type: "string", placeholder: "us" },
    { key: "location", label: "City or region", type: "string", hint: "Use with a country." },
    {
      key: "tbs",
      label: "Time filter",
      type: "select",
      options: ["day", "week", "month", "year"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "sources",
      label: "Sources",
      type: "multiselect",
      options: ["web", "news", "images"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "categories",
      label: "Categories",
      type: "multiselect",
      options: ["github", "research", "pdf"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "scrapeFormats",
      label: "Scrape each result as",
      type: "multiselect",
      options: ["markdown", "html", "links", "screenshot"].map((v) => ({ value: v, label: v })),
      hint: "Leave empty to return search hits only. Scraping each result is billed.",
    },
    { key: "onlyMainContent", label: "Main content only (when scraping)", type: "boolean" },
    ...queryParams,
  ],
  output: [{ key: "data", type: "object", label: "Search results, as returned by Browserless" }],

  async execute(input, ctx) {
    if (!input.query?.trim()) throw new Error("Query is required");
    const formats = input.scrapeFormats ?? [];
    const body = compact({
      query: input.query.trim(),
      limit: input.limit,
      lang: input.lang?.trim(),
      country: input.country?.trim().toLowerCase(),
      location: input.location?.trim(),
      tbs: input.tbs,
      sources: input.sources?.length ? input.sources : undefined,
      categories: input.categories?.length ? input.categories : undefined,
      proxy: input.proxy,
      scrapeOptions: formats.length
        ? compact({ formats, onlyMainContent: input.onlyMainContent ? true : undefined })
        : undefined,
    });
    const data = await new BrowserlessClient(ctx).json("/search", {
      method: "POST",
      query: buildQuery(input),
      body,
    });
    return { data };
  },
};

export default search;
