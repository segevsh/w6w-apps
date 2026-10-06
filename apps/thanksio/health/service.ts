import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "thanks.io platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "thanks.io publishes no status page: status.thanks.io does not resolve and the API " +
      "reference links to none. The `api` reachability check and the derived `auth:*` check " +
      "are the automatable signals.",
  },
};

export default service;
