import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Perspective platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Perspective publishes no status page: status.perspective.co does not resolve " +
      "(checked 2026-10-06) and neither the developer docs nor the site link to one. The `api` " +
      "reachability check and the derived `auth:api-key` check are the automatable signals.",
  },
};

export default service;
