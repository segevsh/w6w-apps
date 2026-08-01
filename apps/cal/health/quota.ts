import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Cal.com exposes no headroom to read, so there is nothing to probe. Declared
 * rather than omitted, for the same reason as an absent status service: a
 * host should be able to tell "we cannot know" from "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and
 * an informational check never worsens a roll-up verdict.
 *
 * Verified 2026-08-01: Cal.com's API v2 docs state a default rate limit of
 * 120 requests/minute per API key (raisable on request), but document no
 * `X-RateLimit-*` / `RateLimit-*` response headers and no dedicated
 * quota-headroom endpoint. Exhaustion is presumably a `429`, but headroom
 * cannot be read ahead of time.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Cal.com's API v2 documents a 120 requests/minute default rate limit but exposes no rate-limit response headers and no headroom endpoint, so remaining quota cannot be read ahead of a 429.",
  },
};

export default quota;
