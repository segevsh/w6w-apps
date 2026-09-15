import type { ActionDefinition } from "@w6w/types";
import { FirecrawlClient } from "../lib/client.ts";
import { sitemapOptions, siteUrlParam } from "../lib/params.ts";

/**
 * `POST /map` — list a site's URLs without fetching any page content.
 *
 * Cheap and fast compared to a crawl: it reads the sitemap and/or follows
 * links to build a URL list, and returns it in one synchronous call rather
 * than starting a job. Useful for deciding what to scrape or crawl next, or
 * for sizing a crawl before running it.
 *
 * `includeSubdomains` and `ignoreQueryParameters` both default to `true` on
 * the vendor's side, which this app mirrors rather than overriding — the
 * opposite of most other defaults in this app, where a small size cap is
 * substituted for the vendor's own generous one.
 */
interface Input {
  url: string;
  search?: string;
  sitemap?: string;
  includeSubdomains?: boolean;
  ignoreQueryParameters?: boolean;
  limit?: number;
}

const map: ActionDefinition<Input> = {
  key: "map",
  type: "search",
  resource: "site",
  title: "Map Site URLs",
  description: "List the URLs Firecrawl can find on a site, without fetching page content.",
  params: [
    siteUrlParam,
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Order results by relevance to this term (matched against the URL itself).",
    },
    { key: "sitemap", label: "Sitemap mode", type: "select", options: sitemapOptions },
    {
      key: "includeSubdomains",
      label: "Include subdomains",
      type: "boolean",
      default: true,
    },
    {
      key: "ignoreQueryParameters",
      label: "Ignore query parameters",
      type: "boolean",
      default: true,
      hint: "Drop URLs that differ only by query string.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 500,
      validation: { integer: true, min: 1, max: 100000 },
      hint: "Firecrawl's own default is 5,000 and its ceiling is 100,000; 500 is prefilled here.",
    },
  ],
  output: [
    { key: "links", type: "array", label: "Links" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "mapping site", { url: input.url });
    const body = await new FirecrawlClient(ctx).json<{ links?: unknown[] }>("/map", {
      method: "POST",
      body: {
        url: input.url,
        search: input.search,
        sitemap: input.sitemap,
        includeSubdomains: input.includeSubdomains,
        ignoreQueryParameters: input.ignoreQueryParameters,
        limit: input.limit,
      },
    });
    return { links: body.links ?? [] };
  },
};

export default map;
