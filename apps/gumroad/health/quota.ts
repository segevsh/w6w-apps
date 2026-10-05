import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Quota headroom — declared as an absence.
 *
 * The reference documents no request-rate limit, no usage meter and no
 * rate-limit response headers for the general API; the only numbers it states
 * are per-token ceilings on the custom-HTML endpoints (30 PUTs/min, 60
 * previews/min), which this app does not wrap. There is nothing to read.
 *
 * `severity: "informational"`: see `health/service.ts`.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Gumroad's API reference documents no rate limit, usage meter or rate-limit headers for " +
      "the endpoints this app wraps, so there is no remaining-quota figure to report.",
  },
};

export default quota;
