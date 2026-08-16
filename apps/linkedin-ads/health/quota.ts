/**
 * Declared absence: quota headroom.
 *
 * The Ad Analytics docs (`integrations/ads-reporting/ads-reporting`, read
 * 2026-08-15) name a hard ceiling — "45 million metric values" requested
 * across all `adAnalytics` queries in a rolling 5-minute window — but no
 * response header or endpoint exposes how much of that window's budget
 * remains. Every live probe run for this app (`GET /rest/adAccounts?q=search`,
 * unauthenticated and with a garbage bearer token, 2026-08-15) carried none
 * of the `X-RateLimit-*` headers this pack's other apps read for `quota`;
 * only LinkedIn's internal routing/tracing headers (`x-li-fabric`,
 * `x-li-pop`, `x-li-uuid`, …) were present.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in a roll-up — at any other
 * severity this would pin the app's verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate limit / analytics data-throttle headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason: "LinkedIn documents a 45M-metric-value/5-minute ceiling on adAnalytics queries and " +
      "unspecified per-account API rate limits, but exposes no response header or endpoint that " +
      "reports remaining headroom for either. Only the 429 itself signals exhaustion.",
  },
};

export default quota;
