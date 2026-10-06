import type { HealthCheckDefinition } from "@w6w/types";

/**
 * No rate-limit headroom is observable: the GraphQL API sends no rate-limit header (measured
 * 2026-10-06 on the sandbox and production hosts, both signed-invalid and unsigned answers) and
 * the SDL has no usage query. A `RESOURCE_LIMIT` error class exists but only shows once hit.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Braintree's GraphQL API sends no rate-limit headers and has no usage query; " +
      "limits surface only as a RESOURCE_LIMIT error once hit. Verified 2026-10-06.",
  },
};

export default quota;
