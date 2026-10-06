/**
 * Quota — declared absent.
 *
 * Iterable documents a per-endpoint rate limit in each operation's description
 * ("Rate limit: 100 requests/second, per project") and answers `429` /
 * `{"code":"RateLimitExceeded"}` once it is exceeded, but a successful response
 * carries no proactive headroom header (measured 2026-10-06: the response
 * headers are `date`, `content-type`, `content-length`, `vary`,
 * `request-time`, `server`, `x-upstream` — no `X-RateLimit-*`). A `quota`
 * check needs a leading indicator, so this is a declared absence with
 * `informational` severity.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason: "Iterable documents per-endpoint rate limits but exposes no quota or rate-limit " +
      "headroom header or endpoint; limits only surface reactively as a 429 RateLimitExceeded.",
  },
};

export default quota;
