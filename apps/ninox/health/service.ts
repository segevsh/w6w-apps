import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Ninox platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Ninox publishes no public status page or feed for the API: `status.ninox.com` " +
      "answers `401` behind HTTP Basic (a Nagios realm) and no other status host was found. " +
      "The `api` reachability check and the derived `auth:*` check are the automatable signals.",
  },
};

export default service;
