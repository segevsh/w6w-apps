import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Harvest documents a rate limit (100 requests per 15 seconds per access
 * token) but no proactive headroom to read: API v2 responses carry no
 * `X-RateLimit-*` / `RateLimit-*` headers, and there is no dedicated limits
 * endpoint. The only signal is reactive — a `429` with a `Retry-After`
 * header once the limit is already exceeded — so there is nothing to probe
 * *before* that happens.
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
    reason:
      "Harvest publishes no rate-limit headers or headroom endpoint. The documented allowance " +
      "is 100 requests per 15 seconds per access token, enforced by a 429 with a Retry-After " +
      "header rather than reported ahead of time.",
  },
};

export default quota;
