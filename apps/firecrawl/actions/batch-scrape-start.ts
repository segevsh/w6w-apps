import type { ActionDefinition } from "@w6w/types";
import { FirecrawlClient } from "../lib/client.ts";
import {
  buildScrapeOptions,
  scrapeOptionParams,
  type ScrapeOptionsInput,
  splitList,
} from "../lib/params.ts";

/**
 * `POST /batch/scrape` — scrape a known, explicit list of URLs (not a crawl:
 * no link discovery, just the URLs given). Returns a job id immediately; poll
 * with `batch-scrape-status-get`.
 *
 * Needs a real API key — measured live on 2026-09-15, this endpoint rejects
 * an unauthenticated request with the same 401 named in `auth/api-key.ts`.
 *
 * `ignoreInvalidURLs` defaults to `true` on the vendor's side (a malformed URL
 * in the list does not fail the whole batch); this app leaves that default in
 * place and surfaces `invalidURLs` in the output rather than overriding it.
 *
 * Not idempotent for the same reason as `crawl-start`: every call bills a
 * fresh batch, and the endpoint documents no idempotency key.
 */
interface Input extends ScrapeOptionsInput {
  urls: string;
  maxConcurrency?: number;
}

const batchScrapeStart: ActionDefinition<Input> = {
  key: "batch-scrape-start",
  type: "perform",
  resource: "batch-scrape",
  title: "Start Batch Scrape",
  description: "Scrape an explicit list of URLs. Returns a job id immediately; poll its status.",
  idempotent: false,
  params: [
    {
      key: "urls",
      label: "URLs",
      type: "text",
      required: true,
      hint: "One URL per line, or comma-separated.",
    },
    {
      key: "maxConcurrency",
      label: "Max concurrency",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Leave empty to use the team's own concurrency limit.",
    },
    ...scrapeOptionParams(),
  ],
  output: [
    { key: "id", type: "string", label: "Batch scrape job ID" },
    { key: "url", type: "string", label: "Status URL" },
    { key: "invalidURLs", type: "array", label: "URLs rejected as invalid" },
  ],

  execute(input, ctx) {
    const list = splitList(input.urls);
    ctx.log("info", "starting batch scrape", { count: list.length });
    return new FirecrawlClient(ctx).json("/batch/scrape", {
      method: "POST",
      body: {
        urls: list,
        maxConcurrency: input.maxConcurrency,
        ...buildScrapeOptions(input),
      },
    });
  },
};

export default batchScrapeStart;
