import type { HealthCheckDefinition } from "@w6w/types";

/**
 * QuickBooks exposes no headroom to read, so there is nothing to probe.
 * Declared rather than omitted, for the same reason as an absent status
 * service: a host should be able to tell "we cannot know" from "nobody
 * looked".
 *
 * QuickBooks enforces fixed, documented per-realm limits — 500 requests/minute
 * and 10 concurrent requests per company, per app — and answers an exceeded
 * limit with HTTP 429 and error code `003001` (`ThrottleExceeded`), but no
 * response header exposes remaining headroom the way Xero's
 * `X-*Limit-Remaining` trio does.
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and
 * an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "QuickBooks enforces a fixed 500 requests/minute, 10-concurrent-request limit per company (realm) per app, but publishes no response header or endpoint exposing remaining headroom — only a 429 (`ThrottleExceeded`) once the limit is hit.",
  },
};

export default quota;
