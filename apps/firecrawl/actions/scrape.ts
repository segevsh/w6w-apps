import type { ActionDefinition } from "@w6w/types";
import { FirecrawlClient } from "../lib/client.ts";
import {
  buildScrapeOptions,
  scrapeOptionParams,
  type ScrapeOptionsInput,
  urlParam,
} from "../lib/params.ts";

/**
 * `POST /scrape` — fetch one URL and return clean markdown (plus whatever
 * other formats were requested).
 *
 * ## Works with no credential at all
 *
 * Firecrawl serves this endpoint on a rate-limited "keyless free tier" —
 * measured live on 2026-09-15, `{"url": "https://example.com"}` with no
 * `Authorization` header answered `200` with a full `ScrapeResponse`. This app
 * still signs every request when a Connection exists, since doing so costs
 * nothing and raises the rate limit; see `auth/api-key.ts` for why that means
 * a successful scrape is *not* proof a key was attached.
 *
 * ## A `200` can still be a failure
 *
 * A page that fails to load (bad DNS, blocked, timed out) is reported as
 * `{"success": false, "code": "...", "error": "..."}` with **HTTP 200** —
 * measured live against a nonexistent domain. `FirecrawlClient` throws on
 * `success: false` regardless of status code, so this action never has to
 * repeat that check.
 */
interface Input extends ScrapeOptionsInput {
  url: string;
}

const scrape: ActionDefinition<Input> = {
  key: "scrape",
  type: "read",
  resource: "page",
  title: "Scrape URL",
  description: "Fetch a single URL and return clean markdown, ready to feed to an LLM.",
  params: [urlParam, ...scrapeOptionParams()],
  output: [
    { key: "markdown", type: "string", label: "Markdown" },
    { key: "html", type: "string", label: "HTML" },
    { key: "rawHtml", type: "string", label: "Raw HTML" },
    { key: "links", type: "array", label: "Links" },
    { key: "screenshot", type: "string", label: "Screenshot URL" },
    { key: "metadata", type: "object", label: "Page metadata" },
  ],

  execute(input, ctx) {
    ctx.log("info", "scraping URL", { url: input.url });
    return new FirecrawlClient(ctx).data("/scrape", {
      method: "POST",
      body: { url: input.url, ...buildScrapeOptions(input) },
    });
  },
};

export default scrape;
