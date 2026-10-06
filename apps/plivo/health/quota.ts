import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Plivo documents account limits (CPS, concurrency, API rate limits) as prose
 * on a docs page; there is no endpoint that returns the ceiling and current
 * usage, and no rate-limit headers are documented. The one number the API does
 * expose is the prepaid credit balance (`cash_credits` on the Account object),
 * but that is a balance with no account-defined ceiling, not headroom against a
 * limit, so it is left to the `get-account` action rather than reported here.
 *
 * Declared rather than omitted: a host can tell "we cannot know" from "nobody
 * looked". `severity: "informational"` because an `unavailable` entry reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Plivo publishes account limits (CPS, concurrency, API rate limits) as documentation only; no endpoint or rate-limit header reports current headroom. Excess voice calls are queued and a 429 signals an exceeded API rate limit.",
  },
};

export default quota;
