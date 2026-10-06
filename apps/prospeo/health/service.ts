import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no vendor status page exists — a positive fact.
 *
 * Checked on 2026-10-06: `status.prospeo.io` does not resolve (curl exit 000),
 * `prospeo.statuspage.io` 302s to the Statuspage marketing site, and neither the API docs
 * nor the site footer link a status page or feed. The `api` check covers reachability.
 *
 * `severity: "informational"`: otherwise the permanent `unknown` pins the app.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Prospeo platform status",
  kind: "service",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason:
      "Prospeo publishes no vendor status page or feed (status.prospeo.io does not resolve and " +
      "no status link appears in the API docs).",
  },
};

export default service;
