import type { HealthCheckDefinition } from "@w6w/types";

/**
 * SimpleTexting publishes no API-readable quota, so this declares `unavailable`
 * with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin the app's verdict at `unknown` forever.
 *
 * ## What the vendor meters, and why none of it is readable up front
 *
 * Credits — the currency every send spends — are verified against the vendor's
 * own OpenAPI 3.0 document (extracted 2026-09-22 from
 * `https://api-doc.simpletexting.com/`, 28 paths / 38 operations) and against a
 * live `401` from `https://api-app2.simpletexting.com/v2/api/tenant` on the same
 * day:
 *
 *  1. **Credits in, never out.** The only credit figure the API returns is the
 *     `credits` field on a *send* response ("Actual credits amount. Can be
 *     negative" — a refund), and `creditsTotal` inside a campaign's `outcome`.
 *     Both are what a send already cost. No operation in the document returns a
 *     balance, so a check cannot know the number before a workflow spends it.
 *  2. **No rate-limit surface at all.** The string "rate limit" (in any
 *     spacing or case) appears **zero** times in the whole document, and no
 *     `RateLimit-*` or `X-RateLimit-*` header was present on the live response —
 *     a `401`, which is the only response an unauthenticated probe can obtain,
 *     so this is one observation rather than a sweep of every endpoint. The one
 *     rate-limit field the API does declare, `requestPerSecLimit` on a webhook,
 *     is a ceiling SimpleTexting applies when *delivering to your URL*; it is not
 *     a statement about what this app may send.
 *  3. **The only headroom signal is indirect.** Credits are visible in the
 *     SimpleTexting dashboard, and `message-evaluate` will price one message
 *     without sending it — but pricing one message is not a quota reading, and
 *     this check is not going to present a per-send cost as remaining balance.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit balance / rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "SimpleTexting exposes no balance or usage endpoint and no rate-limit header. In its API v2 " +
      "document the only credit figures are the `credits` field on a send response and " +
      "`creditsTotal` in a campaign's outcome — both statements about what a send has already " +
      'cost, not about remaining headroom — and the string "rate limit" does not appear ' +
      "anywhere in the document. No RateLimit-* header was present on the live " +
      "api-app2.simpletexting.com response read on 2026-09-22. A per-message price from " +
      "`message-evaluate` is not a balance reading, so this app declares the absence instead of " +
      "reporting one as the other.",
  },
};

export default quota;
