import type { ActionDefinition } from "@w6w/types";
import { FirecrawlClient } from "../lib/client.ts";
import { jobIdParam } from "../lib/params.ts";

/**
 * `GET /batch/scrape/{id}` — poll a batch scrape job. Same shape as
 * `crawl-status-get` (`BatchScrapeStatusResponseObj` mirrors
 * `CrawlStatusResponseObj` field for field), no `success` envelope, and
 * `data` here is the pages themselves.
 */
interface Input {
  id: string;
}

const batchScrapeStatusGet: ActionDefinition<Input> = {
  key: "batch-scrape-status-get",
  type: "read",
  resource: "batch-scrape",
  title: "Get Batch Scrape Status",
  description: "Poll a batch scrape job: status, progress, credits used, and scraped pages.",
  params: [jobIdParam],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "total", type: "number", label: "URLs attempted" },
    { key: "completed", type: "number", label: "URLs completed" },
    { key: "creditsUsed", type: "number", label: "Credits used" },
    { key: "next", type: "string", label: "Next page URL (pagination)" },
    { key: "data", type: "array", label: "Scraped pages" },
  ],

  execute(input, ctx) {
    return new FirecrawlClient(ctx).json(`/batch/scrape/${encodeURIComponent(input.id)}`);
  },
};

export default batchScrapeStatusGet;
