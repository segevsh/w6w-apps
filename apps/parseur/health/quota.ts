import type { HealthCheckDefinition } from "@w6w/types";

/**
 * How much of this account's Parseur plan is left?
 *
 * There is nothing reachable to read:
 *
 *  - **No metered-usage endpoint exists.** The OpenAPI document declares an
 *    `Account` schema with real billing fields (`current_period`,
 *    `monthly_processed_document_max`, ...) — but no path in the document
 *    references it. There is no `/account` or `/me` operation of any kind.
 *  - **No rate-limit header is exposed.** `api-rate-limits.md` documents a
 *    fixed "5 requests/second per IP, burst 20" ceiling in prose, and a live
 *    403 response (2026-09-15, `GET /parser?page_size=1` with a bad key)
 *    carried no `X-RateLimit-*`, `RateLimit-*`, or `Retry-After` header of
 *    any kind.
 *
 * A vendor that documents a ceiling but exposes no readable counter, response
 * header, or account-status endpoint leaves headroom genuinely unknowable
 * rather than merely unread. `severity: "informational"` — an `unavailable`
 * entry always reports `unknown`, and `unknown` outranks `ok` in a roll-up, so
 * this keeps the app's overall verdict from being pinned at `unknown`
 * forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan / rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "No metered-usage endpoint is reachable: the OpenAPI document's Account schema " +
      "(current_period, monthly_processed_document_max) is not exposed by any path, and a live " +
      "403 (2026-09-15) carried no rate-limit header of any kind despite api-rate-limits.md " +
      "documenting a fixed 5 req/s-per-IP ceiling in prose only.",
  },
};

export default quota;
