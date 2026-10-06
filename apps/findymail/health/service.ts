import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no vendor status feed exists — a positive fact.
 *
 * Checked on 2026-10-06: the API reference (app.findymail.com/docs) and the OpenAPI spec link no
 * status page. `status.findymail.com` does not resolve, and `findymail.statuspage.io` answers
 * `302 → https://www.statuspage.io` (the unclaimed-page decoy). The `api` check covers whether
 * the host is answering.
 *
 * `severity: "informational"`: otherwise the permanent `unknown` pins the app.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Findymail platform status",
  kind: "service",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason:
      "Findymail publishes no status page or feed: status.findymail.com does not resolve and " +
      "findymail.statuspage.io redirects to the Statuspage homepage.",
  },
};

export default service;
