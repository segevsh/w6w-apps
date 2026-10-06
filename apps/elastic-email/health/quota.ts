import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Elastic Email's v4 OpenAPI document contains no rate-limit or quota header and
 * no usage endpoint (grep of the 136 KB spec, 2026-10-06, finds no `ratelimit`),
 * and live responses carry none either (only CORS-exposed `X-Total-Count`).
 * Declared absence, `informational` so the permanent `unknown` cannot pin the
 * app's verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Elastic Email publishes no readable quota or rate-limit headroom in its v4 API: no " +
      "rate-limit response header and no usage endpoint, so 'how much is left' cannot be read.",
  },
};

export default quota;
