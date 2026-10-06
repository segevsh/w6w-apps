/**
 * Do we have credits left?
 *
 * Not declared as a probe, on purpose. `GET /v4/account` returns `planCredits`
 * (monthly credits included) and a per-day `usage[].credits` list, but not the
 * billing-period boundary, so "credits used this period" would be a guess at
 * where the month starts; the vendor's own overage model bills past the allowance
 * instead of refusing, so exhaustion is not an outage; and that response echoes
 * the token and child tokens, which a health hook should never read. Rate limits
 * (5 calls/min on Free, 5/s Startup, 25/s Plus) surface only as HTTP 429s, with no
 * header to read. The Get Account Usage action returns the figures for a workflow
 * that wants to decide for itself.
 *
 * `severity: "informational"` keeps the permanent `unknown` from pinning the App.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Diffbot publishes no remaining-credit figure or rate-limit header: /v4/account " +
      "gives the plan allowance and daily usage but no billing-period start, bills overage " +
      "rather than refusing, and echoes the token; rate limits show only as 429s. " +
      "See the Get Account Usage action.",
  },
};

export default quota;
