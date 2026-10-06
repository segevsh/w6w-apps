import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Hyros platform status",
  kind: "service",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "Hyros publishes no machine-readable status page or feed (status.hyros.com does not " +
      "resolve, checked 2026-10-06), so there is nothing stable for the host to read. " +
      "Credential liveness is covered by the auth test.",
  },
};

export default service;
