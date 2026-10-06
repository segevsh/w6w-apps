import type { HealthCheckDefinition } from "@w6w/types";

/**
 * MSG91 publishes no status page this app can read (checked 2026-10-06): `status.msg91.com`
 * answers 200 for EVERY path (`/`, `/api/v2/summary.json`, `/index.json`, `/history.atom`,
 * `/feed.rss`) with the same 127,696-byte HTML page after redirecting to Atlassian's own
 * Statuspage marketing site, which is the catch-all signature, not an MSG91 page.
 * `msg91.statuspage.io/api/v2/summary.json` answers 401 "Your page is inactive" — an unclaimed
 * decoy. `msg91.com/status` is a 404 and neither msg91.com nor docs.msg91.com links a status
 * page. Declared absent; `api` (reachability) and the derived `auth:*` check are the
 * automatable signals.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "MSG91 platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "MSG91 publishes no machine-readable status page: status.msg91.com redirects every " +
      "path to Atlassian's Statuspage marketing site and msg91.statuspage.io is an inactive " +
      "decoy. The `api` reachability check and the derived `auth:*` check are the automatable " +
      "signals.",
  },
};

export default service;
