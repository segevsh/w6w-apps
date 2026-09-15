import type { ActionDefinition } from "@w6w/types";
import { FirecrawlClient } from "../lib/client.ts";
import { jobIdParam } from "../lib/params.ts";

/**
 * `GET /crawl/{id}` — poll a crawl job.
 *
 * ## No `success` envelope here
 *
 * Unlike `scrape`/`search`, this response has no top-level `success` field —
 * it IS `CrawlStatusResponseObj` directly: `status`, `total`, `completed`,
 * `creditsUsed`, `createdAt`/`completedAt`/`duration`, `next` (a URL for the
 * next 10 MB when the response is large or the crawl is still running), and
 * `data` — the scraped pages themselves, not an envelope wrapper. This action
 * therefore uses the client's `json()` (no unwrap), matching the vendor's own
 * shape exactly rather than pretending it matches `scrape`'s.
 *
 * `status` is one of `scraping`, `completed`, `failed` — `cancelled` is also
 * reachable via Cancel Crawl. Retrieving the `next` page (10 MB pagination)
 * is left to a future action; this one returns whatever fits in a single
 * response, which matches every crawl this app is expected to size for.
 */
interface Input {
  id: string;
}

const crawlStatusGet: ActionDefinition<Input> = {
  key: "crawl-status-get",
  type: "read",
  resource: "crawl",
  title: "Get Crawl Status",
  description: "Poll a crawl job: status, progress, credits used, and the pages scraped so far.",
  params: [jobIdParam],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "total", type: "number", label: "Pages attempted" },
    { key: "completed", type: "number", label: "Pages completed" },
    { key: "creditsUsed", type: "number", label: "Credits used" },
    { key: "next", type: "string", label: "Next page URL (pagination)" },
    { key: "data", type: "array", label: "Scraped pages" },
  ],

  execute(input, ctx) {
    return new FirecrawlClient(ctx).json(`/crawl/${encodeURIComponent(input.id)}`);
  },
};

export default crawlStatusGet;
