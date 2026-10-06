/**
 * Do we have quota left? — not knowable, declared as a positive fact.
 *
 * The documented limit is 60 requests per minute (spec, "Rate Limits"), with a 60-second
 * server-side timeout on every request. Neither is observable ahead of time:
 *
 *  - **No rate-limit headers were seen.** The unauthenticated 401 responses measured
 *    2026-10-06 carry only `date`, `content-type`, `server`, `vary`, `allow`,
 *    `x-frame-options`, `x-content-type-options`, `referrer-policy`,
 *    `cross-origin-opener-policy` and `strict-transport-security`. Authenticated responses
 *    could not be sampled without a key, and the spec documents no `X-RateLimit-*` header on
 *    any response (only 429 bodies on the recordings endpoints).
 *  - **No usage endpoint** exists among the 43 documented paths.
 *
 * `severity: "informational"` is required, not stylistic: an `unavailable` entry always
 * reports `unknown`, which would otherwise pin the app's verdict there permanently.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Avoma documents a 60 requests/minute limit but exposes no rate-limit headers " +
      "and no usage endpoint; headroom only shows up as a 429 after it has been exceeded.",
  },
};

export default quota;
