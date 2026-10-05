import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan / request headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason:
      "Granola's OpenAPI 3.1 document (fetched 2026-10-05) declares no rate-limit headers and " +
      "no 429 response on any operation, and states no request ceiling; an unsigned request " +
      "returned none either. Nothing to read headroom from, so it is declared rather than guessed.",
  },
};

export default quota;
