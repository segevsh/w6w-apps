import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Quota headroom is a declared absence. Fellow's Request limits page states the
 * ceilings (3 requests/second and 10,000 requests/day per API key, answered with
 * HTTP 429 and error code `rate_limited`) but documents no remaining-count or
 * reset header and no usage endpoint, so there is nothing to read ahead of the
 * 429 itself. Fellow also says the limits may change and may vary by plan.
 */
const rateLimit: HealthCheckDefinition = {
  key: "rate-limit",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Fellow documents per-key limits of 3 requests/second and 10,000 requests/day, enforced " +
      "with HTTP 429 and error code rate_limited, but publishes no remaining-count header, no " +
      "reset header and no usage endpoint, so headroom cannot be read before the 429. The limits " +
      "are stated to be subject to change and plan-dependent.",
  },
};

export default rateLimit;
