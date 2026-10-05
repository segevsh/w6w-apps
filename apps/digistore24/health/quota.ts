import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Digistore24 documents no readable quota: neither the OpenAPI document nor the
 * API-basics article mentions a rate limit, a rate-limit header, or a usage
 * endpoint, and the unauthenticated responses measured on 2026-10-05 carry no
 * `x-ratelimit-*` header.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, which would otherwise pin the app's verdict there forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Digistore24 publishes no API rate limit, rate-limit response header or usage endpoint, " +
      "so there is no headroom to read.",
  },
};

export default quota;
