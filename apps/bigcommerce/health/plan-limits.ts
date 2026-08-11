import type { HealthCheckDefinition } from "@w6w/types";

/**
 * BigCommerce publishes no readable **object**-limit headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 *
 * ## Why this is separate from `health/quota.ts`
 *
 * BigCommerce meters two independent things and only one is readable in advance.
 *
 *  1. **Request rate** — a per-store quota refreshed every 30 seconds. This *is*
 *     readable, on every single response, and is probed by the `quota` check.
 *  2. **Object counts and storage** — how many products, variants, categories,
 *     SKUs, staff accounts and how much file storage the plan allows. Exhausting
 *     one of these is what `507 Insufficient Storage` means: the vendor's own
 *     status-code table defines it as "when the store has reached a limitation
 *     for the resource, according to their BigCommerce plan (e.g., 500-product
 *     limit)".
 *
 * Collapsing the two would let a healthy request-rate reading imply something
 * about object headroom that BigCommerce never told us — and it is the second
 * one that stops a catalog sync dead.
 *
 * ## Verified two ways on 2026-08-11
 *
 * 1. **Nothing in the API surface.** All 78 distinct OpenAPI documents BigCommerce
 *    publishes at `docs.bigcommerce.com/openapi/` were enumerated from the index
 *    at `docs.bigcommerce.com/docs/rest-catalog/openapi.json`. There is no
 *    limits, usage, entitlements or plan-consumption document among them, and no
 *    such path in the twenty documents this app was built from. The closest
 *    thing, `GET /v2/store`, returns `plan_name`, `plan_level`, `plan_is_trial`
 *    and a `features` block — the plan's *identity*, never a count against it.
 *    (`GET /v3/catalog/summary` returns `inventory_count` and `variant_count`,
 *    which is consumption with no ceiling to compare it to; it ships as the
 *    `catalog-summary-get` Action instead, where a human can read it against a
 *    plan they know.)
 * 2. **Nothing on the wire.** The only rate-related response headers BigCommerce
 *    documents are the four `X-Rate-Limit-*` fields plus `X-Retry-After`,
 *    `X-BC-ApiLimit-Remaining` and `X-BC-Store-Version` — all about requests or
 *    the platform build, none about objects or storage.
 *
 * ## Where the numbers actually live
 *
 * In the Help Center's Platform Limits article, as prose, per plan — not in any
 * API. The documented remedy is to know your plan; a health check cannot read it.
 */
const planLimits: HealthCheckDefinition = {
  key: "plan-limits",
  title: "Plan object-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "BigCommerce exposes no API for plan object limits — how many products, variants, " +
      "categories, SKUs or how much storage the plan still allows. Exhausting one surfaces only " +
      "as a 507 Insufficient Storage on the write that crosses it, after the fact. None of the " +
      "78 OpenAPI documents the vendor publishes describes a limits or usage resource, and no " +
      "documented response header carries an object count; GET /v2/store returns the plan's name " +
      "and level but never a count against it. The figures live in the Help Center's Platform " +
      "Limits article as per-plan prose. Request-rate headroom, which IS readable on every " +
      "response, is reported by the `quota` check instead.",
  },
};

export default planLimits;
