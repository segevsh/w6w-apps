import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason: "Sierra's Swagger document (fetched 2026-10-06) documents no rate limit and no " +
      "rate-limit headers, and an unsigned live response carried none, so there is nothing to " +
      "read headroom from. Declared rather than guessed.",
  },
};

export default quota;
