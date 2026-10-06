import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no vendor status feed exists — a positive fact.
 *
 * Checked on 2026-10-06: `status.actionnetwork.org` and `actionnetworkstatus.com` do not resolve,
 * `actionnetwork.org/status` answers 404, and neither the API docs index nor the site's own pages
 * link a status page. Action Network publishes no machine-readable status, so none is claimed.
 * Whether the API itself is answering is the unsigned `api` check's job.
 *
 * `severity: "informational"`: otherwise the permanent `unknown` pins the app.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Action Network platform status",
  kind: "service",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "Action Network publishes no status page or feed: status.actionnetwork.org does not " +
      "resolve and the docs and site link none. The `api` check probes the public API entry point.",
  },
};

export default service;
