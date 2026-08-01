import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Coda documents numeric rate-limit thresholds (e.g. 100 reads/6s, 10
 * writes/6s, 4 doc-listings/6s) and says exceeding them answers HTTP 429, but
 * publishes no headroom endpoint and no response headers naming remaining
 * quota (no `Retry-After` / `X-RateLimit-*` documented) — so there is nothing
 * to read. Declared rather than omitted, for the same reason as a status feed
 * that doesn't exist: a host should be able to tell "we cannot know" from
 * "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Coda publishes numeric rate limits (e.g. 100 reads/6s, 10 writes/6s) but no headroom endpoint or rate-limit response headers. Exhaustion surfaces only as a plain 429.",
  },
};

export default quota;
