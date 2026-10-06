import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no vendor status feed exists — a positive fact.
 *
 * Checked on 2026-10-06: `status.linkupapi.com` does not resolve, and neither the docs index
 * (`llms.txt`, 74 V2 pages), the V2 pages nor the marketing site link a status page. The unsigned
 * `api` check covers "is the API answering".
 *
 * `severity: "informational"`: otherwise the permanent `unknown` pins the app.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "LinkupAPI platform status",
  kind: "service",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "LinkupAPI publishes no status page or feed: status.linkupapi.com does not resolve " +
      "and the docs and site link none. The `api` check probes the API itself.",
  },
};

export default service;
