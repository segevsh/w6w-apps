import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan headroom",
  kind: "quota",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "Kudosity's v2 API documents no rate-limit headers and no usage or balance " +
      "endpoint; the only limit it names is a per-webhook `rate_limit` setting.",
  },
};

export default quota;
