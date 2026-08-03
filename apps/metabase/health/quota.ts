import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Metabase publishes no request headroom to read, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * Declared rather than omitted, for the same reason as any other absence: a host
 * should be able to render "not knowable" instead of letting an operator
 * conclude the publisher forgot to look.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 * Informational checks never worsen a verdict; they are carried for display.
 *
 * ## Verified three ways, on 2026-08-03
 *
 * 1. **Nothing on the wire.** `GET /api/user/current` against a live Metabase
 *    v0.63.2.7 returned its full header set — `Date`, `X-Frame-Options`,
 *    `Last-Modified`, `Strict-Transport-Security`, `Set-Cookie`,
 *    `X-Permitted-Cross-Domain-Policies`, `Cache-Control`,
 *    `X-Content-Type-Options`, `Content-Security-Policy`, `x-metabase-version`,
 *    `Content-Type`, `Expires`, `Content-Length` — with no `RateLimit-*`, no
 *    `X-RateLimit-*` and no `Retry-After` among them.
 * 2. **Nothing in the specification.** Metabase's own OpenAPI document
 *    (`metabase/metabase`, `docs/api.json`, 1.9 MB, 561 paths) contains **zero**
 *    occurrences of `429`, `RateLimit`, `X-Rate`, `Retry-After`, `rate limit` or
 *    `throttl`. No endpoint declares a throttled response and no header is
 *    documented.
 * 3. **Nothing that would generalise.** Metabase is self-hostable, and a
 *    self-hosted instance enforces whatever its own reverse proxy does — which
 *    this app has no way to read. Even on Metabase Cloud the limit that actually
 *    bites is not a request count.
 *
 * ## The limits that DO exist, and why none of them is this check
 *
 * Metabase constrains queries, not requests, and it does so in ways a `quota`
 * check cannot usefully report:
 *
 *  - **Row caps on the JSON API.** `query_processor/middleware/constraints.clj`
 *    sets `default-unaggregated-query-row-limit` = **2,000** and
 *    `default-aggregated-query-row-limit` = **10,000**, overridable per instance.
 *    These are a truncation ceiling on one result set, not an allowance that
 *    depletes: running the same question a thousand times consumes nothing. (It
 *    is a real trap for a different reason, and is documented in the README and
 *    on the query actions instead.)
 *  - **Concurrent-query slots.** The query processor rejects work when the
 *    connection pool is saturated, and `query_processor/streaming.clj` maps that
 *    to HTTP **503** via `connection-pool-saturated?`. That is a
 *    back-pressure signal delivered by rejection — the same "revealed only by
 *    refusing" shape as a 429, and equally unreadable in advance.
 *  - **Seat and instance limits.** Metabase Cloud meters *people* and
 *    *instances*, which is a billing fact rather than an API allowance, and
 *    which a self-hosted install does not have at all.
 *
 * Reporting a row ceiling or a seat count as if it were rate-limit headroom
 * would be worse than saying plainly that there is none to read.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Metabase publishes no request-rate headroom: a live API response carries no RateLimit-*, " +
      "X-RateLimit-* or Retry-After header, and its OpenAPI document (561 paths) declares no 429 " +
      "and no rate limit anywhere. What it does limit is queries, not requests — a 2,000/10,000 " +
      "row truncation ceiling per result set, and a connection-pool 503 when too many queries run " +
      "at once. Neither is an allowance that can be read before it runs out, and a self-hosted " +
      "instance is bounded by its own reverse proxy, which this app cannot see.",
  },
};

export default quota;
