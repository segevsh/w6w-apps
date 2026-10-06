import type { HealthCheckDefinition } from "@w6w/types";

/**
 * MoonClerk publishes no readable quota: the reference only says throttling exists and answers
 * `429 Too Many Requests` when hit, with no limit, no rate-limit headers and no usage endpoint.
 * `severity: "informational"` is load-bearing: see `service.ts`.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "MoonClerk documents throttling (HTTP 429) but no numeric limit, rate-limit header " +
      "or usage endpoint, so there is no headroom to read.",
  },
};

export default quota;
