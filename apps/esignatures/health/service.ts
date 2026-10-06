import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "eSignatures platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "eSignatures.com publishes no status page and its API reference links to none. " +
      "The `api` reachability check and the derived `auth:*` check are the automatable signals.",
  },
};

export default service;
