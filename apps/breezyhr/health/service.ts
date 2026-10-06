import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Breezy HR publishes no status feed this app can read (checked 2026-10-06).
 * `status.breezy.hr` is a real Pulsetic page (`<title>Status Page | Breezy HR</title>`) but a
 * client-rendered shell: `/api/v2/summary.json`, `/index.json`, `/history.atom` and `/feed.rss`
 * all answer the same ~11.7 KB `text/html` 200 (different bytes only by an embedded timestamp),
 * which is the catch-all signature, not a feed. Declared absent; `api` (reachability) and the
 * derived `auth:*` check are the automatable signals.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Breezy HR platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.breezy.hr is a Pulsetic single-page app with no JSON, RSS or Atom feed " +
      "(every machine path answers the same HTML shell). The `api` reachability check and the " +
      "derived `auth:*` check are the automatable signals.",
  },
};

export default service;
