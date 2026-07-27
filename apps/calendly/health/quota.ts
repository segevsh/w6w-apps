import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Calendly exposes no headroom to read, so there is nothing to probe. Declared
 * rather than omitted, for the same reason as an absent status service: a host
 * should be able to tell "we cannot know" from "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and an
 * informational check never worsens a roll-up verdict.
 *
 * Verified 2026-07-27: Calendly's API v2 documents per-minute/day request limits
 * but returns no `x-ratelimit-*` / `RateLimit-*` response headers to read them
 * from. Exhaustion surfaces only as a `429 Too Many Requests` with a `Retry-After`
 * header, so headroom has to be budgeted from observed 429s rather than read.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Calendly's API v2 exposes no headroom endpoint and returns no rate-limit response headers. Limits are enforced but surface only as a 429 with `Retry-After`, so headroom has to be budgeted from observed 429s rather than read.",
  },
};

export default quota;
