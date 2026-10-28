import type { HealthCheckDefinition } from "@w6w/types";
import { DEFAULT_DAILY_UNITS, SEPARATE_BUCKETS } from "../lib/quota.ts";

/**
 * API quota headroom — **declared, unusually precisely, but not probeable.**
 *
 * Two separate facts, and they pull in opposite directions:
 *
 * 1. YouTube documents its quota *cost model* better than almost any API in this
 *    pack. Every method's price is published, the daily allowance is published,
 *    and the reset time is published. So `unavailable.reason` here can say far
 *    more than the usual "the vendor exposes nothing" — the numbers below are
 *    read from the live table, not remembered.
 *
 * 2. None of that is *readable at runtime*. There is no headroom endpoint, and
 *    the API sends no `X-RateLimit-*`-style headers. Consumption is visible only
 *    in the Google Cloud console (IAM & Admin → Quotas), which is a different
 *    API with different credentials, not something this app's YouTube scope can
 *    reach. Exhaustion is discovered the hard way: 403 `quotaExceeded`.
 *
 * A probe that inferred headroom by making a call would itself spend quota to
 * measure quota, and would still only be able to distinguish "some left" from
 * "none left" — never a number. That is not worth a unit a minute.
 *
 * `severity: "informational"` is mandatory for a declared absence: it always
 * reports `unknown`, and without it that `unknown` would pin the app's roll-up
 * verdict there permanently.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      `The YouTube Data API publishes no headroom endpoint and no rate-limit response headers, so remaining quota cannot be read at runtime — it is visible only in the Google Cloud console (IAM & Admin → Quotas), and exhaustion surfaces as 403 \`quotaExceeded\`. The cost model itself is well documented and worth stating: quota is metered in units, not requests. A default project gets ${
        DEFAULT_DAILY_UNITS.toLocaleString("en-US")
      } units/day shared across all methods, plus separate daily buckets of ${
        SEPARATE_BUCKETS["search.list"]
      } calls for search.list and ${
        SEPARATE_BUCKETS["videos.insert"]
      } calls for videos.insert (1 unit each). A list read costs 1 unit, a write costs 50, caption writes cost 400–450. Every request costs at least 1 unit even when it fails validation, each additional page of a paginated result costs the method's price again, and buckets reset at midnight Pacific Time.`,
  },
};

export default quota;
