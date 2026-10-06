/**
 * Do we have quota left? — not knowable, declared as a positive fact.
 *
 * The one documented limit is 2 requests per second across the whole API (token bucket),
 * answered with a 429 once exceeded. The reference documents no rate-limit response header
 * and no usage endpoint, so "how much is left" cannot be read, only discovered by being
 * refused. `informational` keeps the permanent `unknown` from pinning the app's verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Lexware documents a 2 requests/second limit but exposes no rate-limit headers " +
      "and no usage endpoint; headroom only shows up as a 429 after it has been exceeded.",
  },
};

export default quota;
