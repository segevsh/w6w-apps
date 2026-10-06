import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Loop platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Loop's status page (status.loopreturns.com) is a real status.io HTML page, but " +
      "it publishes no machine-readable feed: /api/v2/summary.json, /index.json, " +
      "/history.atom, /feed.rss and /history.rss all answer an HTML 404. The `api` " +
      "reachability check and the derived `auth:*` check are the automatable signals.",
  },
};

export default service;
