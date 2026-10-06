import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Refiner platform status",
  description:
    "No machine-readable status surface: status.refiner.io is a real Hyperping page with no " +
    "JSON or feed route.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      'status.refiner.io is real (it titles itself "Refiner Status" and lists an `API` and a ' +
      "`Website` service) but is a Hyperping page that publishes no contract: verified live " +
      "2026-10-06 that /api/v2/summary.json, /summary.json, /index.json, /feed.rss, /rss, " +
      "/feed, /history.atom and /json all return a 404, and the only data is Next.js page " +
      "props embedded in the HTML. refiner.statuspage.io is not Refiner's (it 200s Atlassian's " +
      "marketing page). The `api` check and the derived auth:api-key check probe Refiner's " +
      "own API instead, which is the surface a workflow depends on.",
  },
};

export default service;
