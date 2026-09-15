/**
 * Firecrawl — turns web pages into clean, LLM-ready markdown, over the
 * Firecrawl v2 API (`api.firecrawl.dev/v2`).
 *
 * Every path, verb, body field and response shape in this app was verified on
 * 2026-09-15 against Firecrawl's own OpenAPI 3.0 document
 * (`docs.firecrawl.dev/api-reference/v2-openapi.json`, 413,603 bytes,
 * `info.version` `v2`), plus live probes against `api.firecrawl.dev` and
 * `status.firecrawl.dev`. Nothing here came from a third-party integration
 * directory.
 *
 * The three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Two endpoints work with no credential at all** (`auth/api-key.ts`,
 *     `actions/scrape.ts`, `actions/search.ts`). `POST /scrape` and
 *     `POST /search` both answer successfully on a rate-limited "keyless free
 *     tier" — measured live. Every other endpoint this app calls (`map`,
 *     `crawl`, `extract`, `batch/scrape`, `team/credit-usage`) rejects the
 *     same unauthenticated request with a 401 naming that tier explicitly.
 *     That is why the auth probe is a dedicated endpoint, not "try an
 *     action and see if it works" — a successful scrape proves nothing about
 *     whether a key is attached.
 *  2. **HTTP 200 can still mean failure** (`lib/client.ts`). A page that
 *     fails to load answers `{"success": false, "code": "...", "error":
 *     "..."}` with a `200` status — measured live against a nonexistent
 *     domain. Every response this app parses is checked for
 *     `success === false` regardless of status code.
 *  3. **Vendor defaults on size-shaped fields are generous, not conservative**
 *     (`actions/crawl-start.ts`, `actions/map.ts`). `crawl`'s own `limit`
 *     defaults to 10,000 pages; `map`'s defaults to 5,000 links. Both actions
 *     here prefill a much smaller number and say so in the field hint.
 *
 * `crawl`, `batch-scrape` and `extract` are asynchronous: the `*-start`
 * action returns a job id immediately, and a separate `*-status-get` action
 * polls it — the same run/poll split this pack's `apify` app uses for Actor
 * runs.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import scrape from "./actions/scrape.ts";
import map from "./actions/map.ts";
import search from "./actions/search.ts";

import crawlStart from "./actions/crawl-start.ts";
import crawlStatusGet from "./actions/crawl-status-get.ts";
import crawlCancel from "./actions/crawl-cancel.ts";

import batchScrapeStart from "./actions/batch-scrape-start.ts";
import batchScrapeStatusGet from "./actions/batch-scrape-status-get.ts";

import extractStart from "./actions/extract-start.ts";
import extractStatusGet from "./actions/extract-status-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    scrape,
    map,
    search,
    crawlStart,
    crawlStatusGet,
    crawlCancel,
    batchScrapeStart,
    batchScrapeStatusGet,
    extractStart,
    extractStatusGet,
  ],
  // API key only. Firecrawl publishes no OAuth surface for third-party apps.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
