/**
 * Do we have quota left? — not knowable, declared as a positive fact.
 *
 * FareHarbor documents two limits, both **per IP address, not per key**: 30 requests per second
 * and 3,000 per 5-minute window; over either answers 429 or 403 until the window resets. Neither
 * is observable ahead of time: the unauthenticated responses measured 2026-10-06 carry no
 * `X-RateLimit-*` header (only `x-fh-loadbalancer`, `x-amzn-trace-id` and the usual security
 * headers; authenticated responses could not be sampled without keys), and no usage endpoint
 * exists among the 27 documented paths. Because the pool is per IP, it is also shared with
 * every other tenant calling from the same egress, which a per-Connection check could not see.
 *
 * `severity: "informational"` is required: an `unavailable` entry always reports `unknown`,
 * which would otherwise pin the app's verdict there permanently.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "FareHarbor limits requests per IP (30/second, 3,000 per 5 minutes) but exposes no " +
      "rate-limit headers and no usage endpoint; headroom only shows up as a 429/403 after " +
      "it is exceeded.",
  },
};

export default quota;
