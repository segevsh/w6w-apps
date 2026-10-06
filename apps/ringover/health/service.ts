import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no machine-readable vendor status exists — a positive fact.
 *
 * Checked on 2026-10-06: `status.ringover.com` resolves but redirects every path
 * (`/api/v2/summary.json`, `/index.json`, `/history.atom`, `/`) to `https://www.ringover.com/status`,
 * a 1 MB marketing-site HTML page that answers 200 with the same shell for all of them. It is not
 * a Statuspage/Instatus/Better Stack page and offers no feed or JSON, so none is claimed. Whether
 * the API itself is answering is the unsigned `api` check's job.
 *
 * `severity: "informational"`: otherwise the permanent `unknown` pins the app.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Ringover platform status",
  kind: "service",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason:
      "Ringover publishes no machine-readable status: status.ringover.com redirects every path " +
      "(summary.json, index.json, history.atom) to a marketing-site HTML page at " +
      "ringover.com/status. The `api` check probes the public API entry point.",
  },
};

export default service;
