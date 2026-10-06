import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Encharge publishes no status page this check can read. Checked 2026-10-06: the docs and help
 * centre link none, `status.encharge.io` answers 200 but is an unclaimed Freshstatus page (its
 * `__NEXT_DATA__` says `"Status page not found"`, and `/index.json`, `/api/v2/summary.json`,
 * `/history.atom` all return the same 404 shell), and `encharge.statuspage.io` redirects to
 * Atlassian's marketing page. The `api` check answers "is the API serving" directly instead.
 * `informational` keeps this absence from pinning the app's verdict at `unknown`.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Encharge platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Encharge publishes no machine-readable status page. Verified 2026-10-06: " +
      'status.encharge.io is an unclaimed Freshstatus shell ("Status page not found") and ' +
      "encharge.statuspage.io redirects to Atlassian's marketing page. The `api` check probes " +
      "the API host directly.",
  },
};

export default service;
