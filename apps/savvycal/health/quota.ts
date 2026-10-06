import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "SavvyCal's API reference documents no rate limit, no plan quota and no rate-limit " +
      "response headers, and exposes no usage endpoint (GET /v1/me returns only the plan name: " +
      "free, basic or premium). There is nothing to read, so headroom cannot be probed.",
  },
};

export default quota;
