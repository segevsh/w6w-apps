import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Square publishes nothing to probe for headroom, so this is declared
 * `unavailable` rather than omitted: a host should be able to tell "we cannot
 * know" from "nobody looked".
 *
 * What was checked, on 2026-08-03:
 *
 *   - There is no usage/quota endpoint anywhere in Square's OpenAPI document —
 *     no `/v2/usage`, no rate-limit resource, nothing on `/v2/merchants/me`.
 *   - Square's own "Handling errors" guide documents the ENFORCEMENT side only:
 *     excess traffic gets `429 Too Many Requests` with `RATE_LIMIT_ERROR` /
 *     `RATE_LIMITED`, and the advice is exponential backoff with jitter. It
 *     names no `X-RateLimit-*` headers, no `Retry-After`, and no published
 *     ceiling — Square treats the actual limits as unpublished and
 *     account-dependent.
 *
 * So there is no number to report and no header to read: reacting to 429 is the
 * only mechanism Square offers, and that is retry policy, not a health probe.
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and an
 * informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Square publishes no quota endpoint and no rate-limit response headers. Limits are unpublished and enforced only by a 429 carrying RATE_LIMIT_ERROR / RATE_LIMITED, which the vendor's guidance says to handle with exponential backoff and jitter.",
  },
};

export default quota;
