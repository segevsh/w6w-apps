import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Outreach points at https://status.outreach.io for maintenance announcements
 * (getting-started, "Maintenance"), but the host is not a status API: every path
 * we tried — `/api/v2/summary.json`, `/api/v2/status.json`, `/api/v2/components.json`,
 * `/summary.json`, `/api/v1/summary`, `/feed`, `/rss`, `/history.atom` — answers
 * 200 `text/html` with the same 1,382-byte single-page-app shell (the Outreach web
 * app's own bundle), which is exactly the "HTTP 200 is not a real endpoint" trap.
 * There is no JSON status document and no feed to declare, so the absence is
 * declared instead. Informational, or its permanent `unknown` would pin the app's
 * verdict.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Outreach platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.outreach.io is a JavaScript single-page app that answers 200 text/html for every path, with no JSON status API and no Atom/RSS feed. Planned maintenance is announced there for humans, and a maintenance window shows up to the API as a 503 scheduledServerMaintenance. The derived `auth:*` credential check and the `quota` check are the automatable signals.",
  },
};

export default service;
