import type { HealthCheckDefinition } from "@w6w/types";

/**
 * VBOUT enforces 15 requests per second and reports `x-rate-limit-*` headers on every answer,
 * but that is a per-second burst limit, not a quota with headroom to report on, and the
 * documentation names no usage or plan-allowance endpoint. Headroom is not observable.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "VBOUT documents only a 15 requests/second burst limit (answered with HTTP 429) and " +
      "no usage or allowance endpoint, so there is no quota headroom to read.",
  },
};

export default quota;
