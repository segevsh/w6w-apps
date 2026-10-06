import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Loyverse documents one limit — 300 requests per 300 seconds per account,
 * answered with `429 RATE_LIMITED` — and no rate-limit response header and no
 * usage endpoint (checked in the OpenAPI document and its "API rate limits"
 * section, 2026-10-06). A refusal is not a reading, so this is a declared
 * absence. `informational` keeps the permanent `unknown` from pinning the
 * app's verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Loyverse publishes no readable headroom. The only documented limit is 300 requests per " +
      "300 seconds per account, signalled only by a 429 RATE_LIMITED; no rate-limit header or " +
      "usage endpoint exists, so 'how much is left' cannot be read.",
  },
};

export default quota;
