import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Firecrawl actions.
 *
 * Every field here is copied from Firecrawl's own OpenAPI 3.0 document
 * (`docs.firecrawl.dev/api-reference/v2-openapi.json`, fetched 2026-09-15),
 * not inferred.
 */

export const urlParam: Param = {
  key: "url",
  label: "URL",
  type: "string",
  required: true,
  placeholder: "https://example.com",
};

export const siteUrlParam: Param = {
  key: "url",
  label: "Site URL",
  type: "string",
  required: true,
  placeholder: "https://example.com",
};

export const baseUrlParam: Param = {
  key: "url",
  label: "Base URL",
  type: "string",
  required: true,
  placeholder: "https://example.com",
};

/**
 * The general-purpose output formats every scrape-shaped endpoint (`scrape`,
 * `crawl`, `batch-scrape`, `search`) can request.
 *
 * Firecrawl's full `Formats` union also has `json` (schema/prompt-driven
 * extraction — the `extract` action's own job), `changeTracking`, `branding`,
 * `product`, `menu`, `audio`, `video`, `question`, `highlights` and
 * `rawBase64`. Those are vertical-specific or require nested configuration
 * beyond a flat option list, so they are deliberately left out — see the
 * README.
 */
export const formatOptions = [
  { value: "markdown", label: "Markdown (default)" },
  { value: "summary", label: "Summary — an LLM-generated summary of the page" },
  { value: "html", label: "HTML — cleaned, main-content HTML" },
  { value: "rawHtml", label: "Raw HTML — unprocessed page source" },
  { value: "links", label: "Links found on the page" },
  { value: "images", label: "Image URLs found on the page" },
  { value: "screenshot", label: "Screenshot (viewport, not full page)" },
];

/** Wire shape Firecrawl expects for each requested format: `[{"type": "markdown"}, …]`. */
export function buildFormats(
  values: string[] | string | undefined,
): Array<{ type: string }> | undefined {
  if (values === undefined || values === null || values === "") return undefined;
  const list = Array.isArray(values) ? values : [values];
  const cleaned = list.map((v) => String(v).trim()).filter(Boolean);
  return cleaned.length ? cleaned.map((type) => ({ type })) : undefined;
}

/** Normalise a `multiselect`/comma-separated param into a string array. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Split a `text`-type param on newlines AND commas — used for URL lists,
 * where pasting one-per-line is the natural shape but a comma-separated line
 * should work too. Always returns an array, empty when nothing was entered.
 */
export function splitList(value: string | undefined | null): string[] {
  if (!value) return [];
  return value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asJsonOrUndefined<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/**
 * The page-scraping options shared by every endpoint that fetches page
 * content: `scrape` directly, `crawl`/`batch-scrape` under `scrapeOptions`,
 * and `search` under its own `scrapeOptions`.
 *
 * Deliberately narrower than the vendor's full `ScrapeOptions` schema (23
 * fields) — `parsers` (PDF handling), `actions` (in-page automation like
 * click/scroll before capture), `location`/`proxy`/`lockdown`/`redactPII`/
 * `profile`/`threatProtection`/`auditMetadata`/`skipTlsVerification`/
 * `onlyCleanContent`/`minAge` are left out. See the README.
 */
export function scrapeOptionParams(): Param[] {
  return [
    {
      key: "formats",
      label: "Formats",
      type: "multiselect",
      options: formatOptions,
      hint: "What to return for each page. Defaults to markdown alone when left empty.",
    },
    {
      key: "onlyMainContent",
      label: "Main content only",
      type: "boolean",
      default: true,
      hint: "Deterministic HTML-level filter (no LLM) that strips headers, navs, footers, etc. " +
        "before generating markdown. On by default, matching the API.",
    },
    {
      key: "maxAge",
      label: "Max cache age (ms)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Return a cached copy of the page if one younger than this exists; otherwise scrape " +
        "fresh. Firecrawl's own default is 172800000 (2 days) and using the cache can be " +
        "several times faster. Set to 0 to always scrape fresh.",
    },
    {
      key: "waitFor",
      label: "Wait before capture (ms)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Extra delay before reading the page, on top of Firecrawl's own smart wait.",
    },
    {
      key: "timeout",
      label: "Timeout (ms)",
      type: "number",
      default: 60000,
      validation: { integer: true, min: 1000, max: 300000 },
      hint: "1,000–300,000 ms. Firecrawl's own default is 60,000.",
    },
    {
      key: "mobile",
      label: "Emulate mobile device",
      type: "boolean",
    },
    {
      key: "includeTags",
      label: "Include tags",
      type: "string",
      hint: "Comma-separated CSS selectors/tag names to keep in the output.",
    },
    {
      key: "excludeTags",
      label: "Exclude tags",
      type: "string",
      hint: "Comma-separated CSS selectors/tag names to drop from the output.",
    },
    {
      key: "removeBase64Images",
      label: "Remove base64 images",
      type: "boolean",
      hint: "Strip inline base64 image data, which can otherwise dominate the response size.",
    },
    {
      key: "blockAds",
      label: "Block ads and cookie banners",
      type: "boolean",
    },
  ];
}

/** Input shape matching {@link scrapeOptionParams}. */
export interface ScrapeOptionsInput {
  formats?: string[] | string;
  onlyMainContent?: boolean;
  maxAge?: number;
  waitFor?: number;
  timeout?: number;
  mobile?: boolean;
  includeTags?: string;
  excludeTags?: string;
  removeBase64Images?: boolean;
  blockAds?: boolean;
}

/** Build the `ScrapeOptions` wire object from {@link ScrapeOptionsInput}. */
export function buildScrapeOptions(input: ScrapeOptionsInput): Record<string, unknown> {
  return compactOptions({
    formats: buildFormats(input.formats),
    onlyMainContent: input.onlyMainContent,
    maxAge: input.maxAge,
    waitFor: input.waitFor,
    timeout: input.timeout,
    mobile: input.mobile,
    includeTags: toList(input.includeTags),
    excludeTags: toList(input.excludeTags),
    removeBase64Images: input.removeBase64Images,
    blockAds: input.blockAds,
  });
}

/** Drop undefined values so an unset field is genuinely absent from the JSON body. */
function compactOptions(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out;
}

/** Sitemap modes shared by `crawl` and `map`. */
export const sitemapOptions = [
  { value: "include", label: "Include (default) — sitemap plus discovered links" },
  { value: "skip", label: "Skip — discover pages only by following links" },
  { value: "only", label: "Only — sitemap URLs alone, no link discovery" },
];

export const jobIdParam: Param = {
  key: "id",
  label: "Job ID",
  type: "string",
  required: true,
  hint: "The `id` returned when the job was started.",
};
