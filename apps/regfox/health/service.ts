import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "RegFox platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Webconnex publishes no status page that could be found (checked 2026-10-06) and " +
      "the API reference links to none. The `api` reachability check is the automatable " +
      "signal. The vendor does document a weekly maintenance window, Tuesdays 09:00-10:00 UTC, " +
      "during which endpoints may be unavailable.",
  },
};

export default service;
