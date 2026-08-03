import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Odoo meters nothing on the external API, so there is no headroom to report.
 *
 * ## Verified rather than assumed
 *
 * A live `/jsonrpc` response from an Odoo Online instance (2026-08-03) carried
 * no rate-limit headers at all: no `RateLimit`, no `RateLimit-Limit` /
 * `-Remaining` / `-Reset`, no legacy `X-Rate-Limit-*`, no `Retry-After`. There
 * is nothing on the wire to read, and Odoo's external API documentation
 * describes no request quota, budget or throttle to read it from.
 *
 * That is consistent with what Odoo actually is: a self-hostable application
 * server talking to its own Postgres, not a metered multi-tenant API product.
 * The real ceiling on an Odoo instance is its worker count and database — a
 * capacity question, not an allowance one, and not something a client can
 * observe from a response header.
 *
 * The relevant *commercial* limit is not a rate at all: Odoo restricts external
 * API access by plan, stating on both external-API pages that "Access to data
 * via the external API is only available on Custom Odoo pricing plans. Access to
 * the external API is not available on One App Free or Standard plans." That is
 * a binary entitlement, not headroom — when it is absent, calls fail outright
 * and the derived `auth:*` check reports it. A `quota` reading would be the
 * wrong shape for it.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, which outranks `ok` in the roll-up, so at any other
 * severity this declared absence would pin every verdict at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Odoo publishes no rate-limit headers on /jsonrpc and documents no request quota — a live " +
      "response carried no RateLimit, X-Rate-Limit-* or Retry-After header of any kind (verified " +
      "2026-08-03). External API access is gated by pricing plan rather than metered per " +
      "request, and that entitlement shows up as an outright failure the derived `auth:*` check " +
      "already reports.",
  },
};

export default quota;
