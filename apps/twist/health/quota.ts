/**
 * Rate-limit headroom — declared unavailable.
 *
 * The v3 reference (2026-10-06) greps clean for `rate limit`, `429`, `throttl` and
 * `X-RateLimit`; its only "Limits" section covers text-field sizes (15,000 characters). The one
 * header seen live is `retry-after`, present even on a 403 and carrying a 1-3 second value, which
 * is not a remaining-count. There is no usage endpoint either.
 *
 * `severity: "informational"` is required: an `unavailable` entry always reports `unknown`.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Twist documents no rate limit, no rate-limit headers and no usage endpoint; the only " +
      "limits published are text-field sizes.",
  },
};

export default quota;
