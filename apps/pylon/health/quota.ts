import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Pylon documents a per-endpoint rate limit in prose ("Rate limit: 300 requests per minute" on
 * reads, 120 on updates and searches, 30 on creates, `GET /issues` and deletes) and answers 429
 * with the code `rate_limited` and an `X-Retry-After` header. No `X-RateLimit-*` header and no
 * usage endpoint exists in the reference or on the responses probed on 2026-10-06, so "how much
 * is left" cannot be read. A refusal is not a reading, so this is a declared absence;
 * `informational` keeps the permanent `unknown` from pinning the app's verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Pylon documents per-endpoint rate limits in prose and signals a breach only with a 429 " +
      "and an X-Retry-After header; no rate-limit headers or usage endpoint exist, so headroom " +
      "cannot be read.",
  },
};

export default quota;
