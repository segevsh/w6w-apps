/** Crawl `jobStatus.status` codes, from docs.diffbot.com/docs/crawl/manage. */
export const CRAWL_STATUS: Record<number, string> = {
  0: "Job is initializing",
  1: "Job has reached maxRounds limit",
  2: "Job has reached maxToCrawl limit",
  3: "Job has reached maxToProcess limit",
  4: "Next round to start shortly",
  5: "No URLs were added to the crawl",
  6: "Job paused",
  7: "Job in progress",
  8: "All crawling temporarily paused by Diffbot for maintenance",
  9: "Job has completed and no repeat is scheduled",
  10: "Failed to crawl any seed",
  11: "Job automatically paused because the crawl is inefficient",
};

/** Status codes after which a job will not make further progress on its own. */
export const CRAWL_FINISHED = new Set([1, 2, 3, 5, 9, 10, 11]);

export interface CrawlJob {
  name?: string;
  type?: string;
  jobStatus?: { status?: number; message?: string };
  [k: string]: unknown;
}

/**
 * Job fields that may carry the token. The vendor's own example redacts
 * `downloadJson` / `downloadUrls` (`…/crawl/download/<REDACTED>.json`), which is
 * where Diffbot builds the URL from the token, so neither is ever returned — use
 * Get Crawl Data for the results.
 */
const SECRET_KEYS = ["downloadJson", "downloadUrls", "token"];

/** Add `statusCode`, `statusMessage` and `finished` to a vendor job object, minus token-bearing URLs. */
export function shapeJob(job: CrawlJob): Record<string, unknown> {
  const code = job.jobStatus?.status;
  const rest: Record<string, unknown> = { ...job };
  for (const k of SECRET_KEYS) delete rest[k];
  return {
    ...rest,
    statusCode: code,
    statusMessage: job.jobStatus?.message ?? (code !== undefined ? CRAWL_STATUS[code] : undefined),
    finished: code !== undefined ? CRAWL_FINISHED.has(code) : false,
  };
}
