import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Recruiterflow platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Recruiterflow publishes no status page: no status page is linked from the site or " +
      "the API reference, and status.recruiterflow.com answers its marketing-site HTML rather " +
      "than a status schema. The `api` reachability check and the derived `auth:*` check are " +
      "the automatable signals.",
  },
};

export default service;
