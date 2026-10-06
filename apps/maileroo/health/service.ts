import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Maileroo's status page is real and linked from its own llms.txt and site: a hosted Uptime.com
 * page at status.maileroo.net (`<title>Maileroo (Uptime) | Uptime.com</title>`, with an "Email API"
 * component among its components). It has no machine-readable surface this app can read, checked
 * 2026-10-06: `/api/v2/summary.json` and `/index.json` answer a bare openresty 404, and
 * `/history.atom`, `/history.rss`, `/feed.rss` answer Uptime.com's own "Page Not Found" HTML.
 * The component data is only embedded in the rendered HTML, which is not a contract. Declared
 * absent rather than scraped; `api` and the derived `auth:*` check are the automatable signals.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Maileroo platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.maileroo.net is a real Uptime.com status page, but it publishes no JSON, " +
      "RSS or Atom feed (those paths answer 404); its component statuses exist only inside the " +
      "rendered HTML. The `api` reachability check and the derived `auth:*` check are the " +
      "automatable signals.",
  },
};

export default service;
