import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Outseta publishes no headroom endpoint and no rate-limit counter headers. The only " +
      "documented limit is that requests authorised by an API key should not exceed 4 " +
      "requests/second, which is guidance rather than an enforced, observable quota.",
  },
};

export default quota;
