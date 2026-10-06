/**
 * Is Diffbot up?
 *
 * Diffbot links `status.diffbot.com`, verified live 2026-10-06: it is a **Pingdom
 * Public Reports** page (`Pingdom Public Reports Overview`, a seven-day uptime
 * grid rendered into HTML). It has no JSON, RSS or Atom output: `/index.json`,
 * `/api/v2/summary.json`, `/rss`, `/history.atom`, `/feed.rss` and `/history` all
 * answer 404, and `diffbot.statuspage.io` redirects to Atlassian's marketing page.
 * Nothing machine-readable exists to fetch, so this is a declared absence.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok`, so at any other severity it
 * would pin the App's verdict at `unknown` forever. The `api` check (unsigned
 * reachability of the four API hosts) and the derived `auth:api-token` check are
 * the automatable signals.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Diffbot platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.diffbot.com is a Pingdom Public Reports HTML page with no JSON, RSS or Atom " +
      "feed (every machine path 404s; checked 2026-10-06). The `api` check and the derived " +
      "auth:api-token check are the automatable signals.",
  },
};

export default service;
