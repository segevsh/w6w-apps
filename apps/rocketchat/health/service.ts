import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Rocket.Chat Cloud status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Rocket.Chat's status page (status.rocket.chat) is a custom HTML page with no feed: " +
      "verified 2026-10-06 that /api/v2/summary.json, /index.json, /history.atom, /rss and " +
      "/api/v1/components all answer 404, and /api/v1/incidents answers an empty list. The `site` " +
      "check probes this connection's own workspace host directly.",
  },
};

export default service;
