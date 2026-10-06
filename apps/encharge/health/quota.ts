import type { HealthCheckDefinition } from "@w6w/types";

/**
 * The developer docs and the OpenAPI document (searched 2026-10-06 for "rate limit", "429",
 * "throttl", "quota") document no rate limit, no rate-limit header and no usage endpoint. A
 * refusal is not a reading, so this is a declared absence. `informational` keeps the permanent
 * `unknown` from pinning the app's verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Encharge documents no rate limit, rate-limit header or usage endpoint, so 'how " +
      "much is left' cannot be read.",
  },
};

export default quota;
