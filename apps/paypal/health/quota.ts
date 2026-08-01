import type { HealthCheckDefinition } from "@w6w/types";

/**
 * PayPal publishes no `X-RateLimit-*` (or equivalent) response headers and no
 * quota-lookup endpoint. Its own documentation is explicit about this:
 * "PayPal does not publish a rate limiting policy" — limits are dynamic,
 * vary per API/environment/traffic pattern, and only surface after the fact
 * as an HTTP 429 (`RATE_LIMIT_REACHED`).
 *
 * Declared rather than omitted, for the same reason as an absent status
 * service: a host should be able to tell "we cannot know" from "nobody
 * looked". `severity: "informational"` — an `unavailable` entry reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "PayPal publishes no rate-limit headers or quota endpoint. Limits are dynamic and " +
      "undocumented; exhaustion surfaces only as a 429 RATE_LIMIT_REACHED after the fact.",
  },
};

export default quota;
