/**
 * Do we have quota left? — not knowable, declared as a positive fact.
 *
 * Slite documents a `429` (`{"id":"rate-limit","message":"You've reached the api rate limit.
 * Please wait and retry later."}`) on every operation, and a separate `AskRateLimitedError`
 * on `GET /ask`, but states no number, no window, and no rate-limit header: the only response
 * headers in any of the operation documents are `Location` and `Retry-After` on the `202`
 * of `/ask` and `/threads/{id}`. There is no usage endpoint. Headroom only shows up as a 429
 * after it has been exceeded.
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
    reason: "Slite documents a 429 rate-limit error but no limit, no rate-limit headers and " +
      "no usage endpoint; headroom only shows up after it has been exceeded.",
  },
};

export default quota;
