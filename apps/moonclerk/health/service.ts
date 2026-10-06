import type { HealthCheckDefinition } from "@w6w/types";

/**
 * MoonClerk publishes no status feed this app can read (checked 2026-10-06).
 * `status.moonclerk.com` is a real page (`<title>MoonClerk Status</title>`, a Next.js app) but
 * `/summary.json`, `/api/v2/summary.json`, `/history.rss`, `/history.atom` and `/feed.rss` all
 * answer its HTML 404 page, and `moonclerk.statuspage.io` is Atlassian's marketing page (no
 * claimed Statuspage). Declared absent; `api` (reachability) and the derived `auth:*` check
 * are the automatable signals.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "MoonClerk platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.moonclerk.com is a Next.js page with no JSON, RSS or Atom feed (every " +
      "machine path answers its HTML 404), and moonclerk.statuspage.io is unclaimed. The `api` " +
      "reachability check and the derived `auth:*` check are the automatable signals.",
  },
};

export default service;
