import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Attio exposes no request headroom to read, so there is nothing to probe.
 * Declared rather than omitted, so a host can tell "we cannot know" from
 * "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and at
 * the default `degraded` severity that would pin the app at `unknown` forever.
 *
 * ## Verified three ways, on 2026-08-03
 *
 * 1. **Nothing on the wire.** Live responses from `api.attio.com` carry the full
 *    header set — `date`, `content-type`, `content-length`,
 *    `x-attio-execution-id`, `vary`, the CORS trio, `x-frame-options`, `via`,
 *    `alt-svc`, `cf-cache-status`, `strict-transport-security`, `server`,
 *    `cf-ray` — and **no** `RateLimit-*`, no `X-RateLimit-*` and no
 *    `Retry-After` among them. Checked on `GET /v2/self` and `GET /v2/objects`.
 *
 * 2. **Nothing in the specification.** Attio's own OpenAPI documents
 *    (`https://api.attio.com/openapi/api`, 770 KB, and
 *    `.../openapi/standard-objects`, 1.0 MB) contain **zero** occurrences of
 *    `ratelimit`, `rate_limit`, `X-Rate…` or `Retry-After`, and not one of the
 *    77 operations declares a `429` response at all. The documented status codes
 *    across both documents are 200, 201, 202, 204, 302, 400, 403, 404, 409, 413.
 *
 * 3. **Nothing to poll.** There is no usage, limits or quota endpoint anywhere
 *    in the surface. The only near-miss is the `quota_exceeded` error code, and
 *    it is a different thing entirely — it is returned by `POST /v2/objects`
 *    with the message "You have met your plan's object limit. Please upgrade
 *    your plan to create more objects." A plan ceiling, reported only at the
 *    moment you hit it, not request allowance.
 *
 * ## What Attio DOES publish, and why it still is not a check
 *
 * The Rate limiting guide gives fixed, workspace-independent numbers: "Our rate
 * limit across the whole API is **100 requests per second** for read requests,
 * **25 requests per second** for write requests", plus a note that they "may
 * occasionally reduce the rate limit as part of incident response". Exceeding it
 * returns `429` with a `Retry-After` whose value is a **date** ("Retry-After:
 * Tue, 23 May 2023 14:42:01 GMT"), not a delta-seconds count.
 *
 * `List records` and `List entries` carry an additional **score-based** limit:
 * "Each request receives a complexity score. The score is a function of the
 * requests' sorts and filters as well as the total record/entry count", summed
 * over a sliding 10-second window and "summed across all apps and access tokens
 * using the API".
 *
 * Neither is readable ahead of time. A check could restate the constants, but a
 * constant is not a measurement: it would report `ok` at 100% and `ok` at 0%
 * identically, and an entry that never changes teaches an operator to ignore it.
 * The one live signal that exists — `x-attio-record-query-score`, named in the
 * `access-control-expose-headers` list on every response — appears only on the
 * two query endpoints, describes the cost of the request just made rather than
 * the allowance remaining, and could not be observed without a working token, so
 * it is not built on.
 *
 * Reporting `unknown` on every run, or dressing up a published constant as a
 * reading, are both worse than saying plainly that there is no headroom to read.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Attio publishes no request-rate headroom: live API responses carry no RateLimit-*, " +
      "X-RateLimit-* or Retry-After header, its two OpenAPI documents contain no rate-limit " +
      "header and declare no 429 on any of the 77 operations, and there is no usage or limits " +
      "endpoint to poll. The documented limits (100 read / 25 write requests per second, plus a " +
      "complexity score on the two query endpoints) are fixed constants, and the only " +
      "`quota_exceeded` error is a PLAN ceiling on object creation, not request allowance.",
  },
};

export default quota;
