import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Clearout publishes no status feed this app can read (checked 2026-10-06).
 * `status.clearout.io` is a real Pulsetic page (`<title>Service Status Updates |
 * Clearout</title>`), but it is a client-rendered shell: `/summary.json`, `/index.json`,
 * `/history.atom`, `/feed`, `/rss`, `/api/v2/summary.json`, `/api/status` and
 * `/status.json` all answer the same ~11.7 KB `text/html` 200 (different bytes only by an
 * embedded timestamp), which is the catch-all signature, not a feed. `clearout.statuspage.io`
 * 302s to Atlassian's marketing page. Declared absent; `api` (reachability) and the derived
 * `auth:*` check are the automatable signals.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Clearout platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.clearout.io is a Pulsetic single-page app with no JSON, RSS or Atom feed " +
      "(every machine path answers the same HTML shell). The `api` reachability check and the " +
      "derived `auth:*` check are the automatable signals.",
  },
};

export default service;
