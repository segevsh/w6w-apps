import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Ahrefs publishes no status feed this app can read (checked 2026-10-06). `status.ahrefs.com`
 * answers a bare nginx `404 Not Found` for `/`, `/api/v2/summary.json`, `/index.json` and
 * `/history.atom`; `ahrefs.statuspage.io` 302s to Atlassian's marketing page (127,696 bytes of
 * Statuspage product HTML — the unclaimed-page decoy, not an Ahrefs feed); `ahrefs.com/status`
 * is a 404. Declared absent; `api` (reachability) and the derived `auth:*` check are the
 * automatable signals.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Ahrefs platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Ahrefs has no public machine-readable status page: status.ahrefs.com is a bare 404 " +
      "and ahrefs.statuspage.io is the unclaimed Atlassian decoy. The `api` reachability check " +
      "and the derived `auth:*` check are the automatable signals.",
  },
};

export default service;
