import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Checked 2026-10-06: no Klipfolio status page could be found. `klipfolio.statuspage.io`
 * resolves but redirects to Atlassian's Statuspage marketing page (unclaimed);
 * `status.klipfolio.com`, `status.powermetrics.io`, `klipfolio.status.io` do not
 * resolve; neither the API reference nor the klipfolio.com home page links one.
 * Declared rather than omitted, `informational` so the permanent `unknown` never
 * pins the app's verdict. The `api` check covers reachability.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Klipfolio platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Klipfolio publishes no public status page or feed that could be found: klipfolio.statuspage.io redirects to Atlassian's Statuspage marketing site (unclaimed) and no status.* host resolves. Use the `api` reachability check.",
  },
};

export default service;
