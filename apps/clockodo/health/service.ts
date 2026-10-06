import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Clockodo publishes no status page (checked 2026-10-06). No `status.clockodo.*` host answers and
 * `clockodo.statuspage.io` redirects to Atlassian's Statuspage marketing site. Declared absent;
 * `api` (reachability) and the derived `auth:api-key` check are the automatable signals.
 *
 * `severity: "informational"` is required: an `unavailable` entry always reports `unknown`, which
 * would otherwise pin the app's verdict there permanently.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Clockodo platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Clockodo publishes no status page or feed: no status.clockodo.* host answers and " +
      "the statuspage.io name redirects to Atlassian's marketing site. The `api` reachability " +
      "check and the derived `auth:*` check are the automatable signals.",
  },
};

export default service;
