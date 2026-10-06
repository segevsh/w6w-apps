import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no vendor status feed exists — a positive fact.
 *
 * Checked on 2026-10-06: `status.zeplin.io` answers a 302 to the marketing home page
 * (`https://zeplin.io/`), `zeplin.statuspage.io/api/v2/summary.json` answers "Your page is
 * inactive", and neither the API docs index nor the docs link a status page. Zeplin publishes no
 * machine-readable status, so none is claimed. Whether the API itself is answering is the unsigned
 * `api` check's job.
 *
 * `severity: "informational"`: otherwise the permanent `unknown` pins the app.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Zeplin platform status",
  kind: "service",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason:
      "Zeplin publishes no status page or feed: status.zeplin.io redirects to the marketing home " +
      "page, its Statuspage is inactive, and the API docs link none. The `api` check probes the API itself.",
  },
};

export default service;
