import type { ActionDefinition } from "@w6w/types";
import { FirecrawlClient } from "../lib/client.ts";
import {
  baseUrlParam,
  buildScrapeOptions,
  scrapeOptionParams,
  type ScrapeOptionsInput,
  sitemapOptions,
  toList,
} from "../lib/params.ts";

/**
 * `POST /crawl` — start crawling a whole site. Returns a job id immediately;
 * poll it with `crawl-status-get`.
 *
 * ## The vendor's own default limit is enormous
 *
 * `limit` (max pages) defaults to Firecrawl's own ceiling of **10,000** when
 * left unset — documented directly in the OpenAPI schema. A workflow step
 * that starts a crawl with no limit in mind can end up paying for, and
 * waiting on, ten thousand pages. This action prefills 100 and says so.
 *
 * ## Needs a real API key
 *
 * Unlike `scrape`/`search`, this endpoint is not on the keyless tier —
 * measured live on 2026-09-15, an unauthenticated request is refused with the
 * same 401 named in `auth/api-key.ts`.
 *
 * ## Not idempotent
 *
 * Every call starts a new, separately billed crawl. There is no documented
 * idempotency key for this endpoint (unlike Webhook creation on other APIs in
 * this pack), so a retry after a dropped connection risks a duplicate crawl —
 * `idempotent` is `false`.
 */
interface Input extends ScrapeOptionsInput {
  url: string;
  includePaths?: string;
  excludePaths?: string;
  maxDiscoveryDepth?: number;
  sitemap?: string;
  ignoreQueryParameters?: boolean;
  crawlEntireDomain?: boolean;
  allowExternalLinks?: boolean;
  allowSubdomains?: boolean;
  limit?: number;
}

const crawlStart: ActionDefinition<Input> = {
  key: "crawl-start",
  type: "perform",
  resource: "crawl",
  title: "Start Crawl",
  description: "Start crawling a whole site. Returns a job id immediately; poll Get Crawl Status.",
  idempotent: false,
  params: [
    baseUrlParam,
    {
      key: "includePaths",
      label: "Include paths",
      type: "string",
      hint: "Comma-separated URL pathname regex patterns (Rust/RE2 syntax — no look-around or " +
        "backreferences). Only matching paths are crawled. The start URL is checked too, so a " +
        "pattern that excludes it returns zero pages.",
    },
    {
      key: "excludePaths",
      label: "Exclude paths",
      type: "string",
      hint: "Comma-separated URL pathname regex patterns to skip. Same syntax as Include paths.",
    },
    {
      key: "maxDiscoveryDepth",
      label: "Max discovery depth",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "The start URL and sitemapped pages are depth 0.",
    },
    { key: "sitemap", label: "Sitemap mode", type: "select", options: sitemapOptions },
    {
      key: "ignoreQueryParameters",
      label: "Ignore query parameters",
      type: "boolean",
      hint: "Do not re-crawl the same path under different query strings.",
    },
    {
      key: "crawlEntireDomain",
      label: "Crawl entire domain",
      type: "boolean",
      hint: "Off (default): only follows deeper (child) paths. On: also follows sibling/parent " +
        "internal links.",
    },
    {
      key: "allowExternalLinks",
      label: "Allow external links",
      type: "boolean",
      hint:
        "Follow links to other domains, one hop deep. A homepage-only external link is skipped.",
    },
    {
      key: "allowSubdomains",
      label: "Allow subdomains",
      type: "boolean",
      hint: "Follow links to subdomains of the base URL's domain.",
    },
    {
      key: "limit",
      label: "Max pages",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1 },
      hint: "Firecrawl's own default is its ceiling of 10,000 pages. 100 is prefilled here.",
    },
    ...scrapeOptionParams(),
  ],
  output: [
    { key: "id", type: "string", label: "Crawl job ID" },
    { key: "url", type: "string", label: "Status URL" },
  ],

  execute(input, ctx) {
    ctx.log("info", "starting crawl", { url: input.url });
    return new FirecrawlClient(ctx).json("/crawl", {
      method: "POST",
      body: {
        url: input.url,
        includePaths: toList(input.includePaths),
        excludePaths: toList(input.excludePaths),
        maxDiscoveryDepth: input.maxDiscoveryDepth,
        sitemap: input.sitemap,
        ignoreQueryParameters: input.ignoreQueryParameters,
        crawlEntireDomain: input.crawlEntireDomain,
        allowExternalLinks: input.allowExternalLinks,
        allowSubdomains: input.allowSubdomains,
        limit: input.limit,
        scrapeOptions: buildScrapeOptions(input),
      },
    });
  },
};

export default crawlStart;
