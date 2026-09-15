import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Tremendous publishes no readable request-rate headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin every verdict at `unknown`
 * forever.
 *
 * ## Verified two ways on 2026-09-15
 *
 * 1. **Nothing on the wire.** A `HEAD /api/v2/ping` against both
 *    `api.tremendous.com` and `testflight.tremendous.com` (unauthenticated,
 *    so it fails with `401`, but the headers are unrelated to that) carried
 *    `date`, `content-type`, `server`, the usual `x-frame-options` /
 *    `x-content-type-options` security headers, `x-request-id`, `x-runtime`,
 *    `via`, `strict-transport-security`, `cf-cache-status`, `set-cookie` and
 *    `cf-ray` — and **no** `X-RateLimit-Limit`, **no**
 *    `X-RateLimit-Remaining`, and no header of any name mentioning "rate" or
 *    "limit".
 * 2. **Nothing in the documentation.** The `rate-limiting` guide states a
 *    single fixed ceiling and says the only signal is the `429` response
 *    itself ("If you exceed the rate limit... simply pause... and try
 *    again"); it documents no header exposing a remaining count and no way
 *    to request one short of emailing developers@tremendous.com for a raised
 *    ceiling.
 *
 * ## The ceiling that DOES exist
 *
 * **10 requests/second**, fixed, per the `rate-limiting` guide. Enforced by
 * refusal (`429`, body `{"error": {"message": "Too many requests", "payload":
 * {}}}`) — note this is the ONE place Tremendous's error body departs from
 * the `{"errors": {...}}` shape `lib/client.ts` otherwise handles uniformly;
 * both are read defensively by {@link formatTremendousError [lib/client.ts]}
 * falling back to the raw text when neither shape parses as expected. The
 * documented remedy is a client-side pause, which is a client behavior, not
 * something a health check can read in advance.
 */
const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Tremendous exposes no remaining request count: a live response from api.tremendous.com " +
      "and testflight.tremendous.com carries no X-RateLimit-* (or similarly named) header, and " +
      "the rate-limiting guide states the only signal is the 429 itself. The ceiling is fixed " +
      "at 10 requests/second, and the documented remedy is a client-side 1-second pause before " +
      "retrying.",
  },
};

export default requestRate;
