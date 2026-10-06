import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Vendor status: unavailable. Verified 2026-10-06: `status.baremetrics.com`
 * redirects to `baremetrics.statuspage.io`, whose `/api/v2/summary.json` answers
 * `401 "Your page is inactive. Please include an API key to access this resource."`
 * — a Statuspage account that is switched off, not a status feed. The developer
 * docs link no other status page.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Baremetrics publishes no machine-readable status: status.baremetrics.com redirects to " +
      'baremetrics.statuspage.io, whose summary.json answers 401 "Your page is inactive". ' +
      "Credential liveness is covered by the derived auth:api-key check, and request-rate " +
      "headroom by the `quota` check.",
  },
};

export default service;
