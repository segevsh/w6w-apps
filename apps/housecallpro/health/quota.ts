import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Housecall Pro publishes no readable rate-limit headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe one.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity this declared absence would pin the app's verdict at `unknown`
 * forever.
 *
 * ## Verified two ways on 2026-08-11
 *
 * 1. **Nothing on the wire.** Responses from `api.housecallpro.com` carried
 *    `date`, `content-type`, `status`, `cache-control`, `vary`,
 *    `strict-transport-security`, `referrer-policy`,
 *    `x-permitted-cross-domain-policies`, `x-xss-protection`, `x-request-id`,
 *    `x-runtime`, `x-frame-options` and `x-content-type-options` — and no
 *    `X-RateLimit-Limit`, no `X-RateLimit-Remaining`, no `X-RateLimit-Reset` and
 *    no `Retry-After`. Twelve consecutive unauthenticated requests inside one
 *    minute produced twelve 401s, no 429, and not one rate-limit header on any
 *    of them.
 * 2. **Nothing in the documentation.** The whole 222,172-byte OpenAPI document
 *    mentions rate limiting exactly once, in prose, on one endpoint: `POST
 *    /jobs/{job_id}/line_items` is described as "a rate limited request. If you
 *    intend to create multiple line items for the same job use Bulk update a
 *    job's line items request." No number, no window, no header, no consumption
 *    endpoint. Grepping the four published prose pages
 *    (`authentication`, `changelog`, `franchise`, `webhooks`) for rate-limit
 *    language returns nothing at all.
 *
 * ## What that one sentence is actually worth
 *
 * It is not a quota signal, but it is a real design constraint and it is acted
 * on: this app exposes `job-line-item-create` for a single item and says in its
 * own description that adding several to one job is what the vendor's bulk
 * endpoint is for. That is the whole mitigation available — there is no budget
 * to read and nothing to report.
 *
 * A probe cannot substitute for this either. Discovering a remaining budget by
 * spending it — issuing requests until one 429s — costs the user the very quota
 * being measured, against a ceiling the vendor has never published.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Housecall Pro exposes no remaining request count. Responses from api.housecallpro.com " +
      "carry no X-RateLimit-* header and no Retry-After (verified across twelve requests in one " +
      "minute, all 401, none rate-limited), there is no consumption endpoint, and the 222 KB " +
      "OpenAPI document mentions rate limiting once — as prose on POST /jobs/{job_id}/line_items, " +
      "with no number, window or header. The four published prose pages mention it not at all.",
  },
};

export default quota;
