import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Bluesky up? — checked live on 2026-08-18, and the answer is "there is a
 * status page, but nothing on it is a contract".
 *
 * `status.bsky.app` is an **UptimeRobot** public status page — identifiable
 * from its own markup (`psp-logos.uptimerobot.com`,
 * `/assets/img/uptimerobot-logo-dark.svg`), not an Atlassian Statuspage, which
 * is what the rest of this pack's vendors use. Every Statuspage-shaped path is
 * a **404 that returns HTML**: `/api/v2/summary.json`, `/summary.json`,
 * `/index.json`, `/history.rss` — all of them.
 *
 * There *is* a working JSON route. Reading the page's own JavaScript turns up:
 *
 *     pspApiPath = 'https://status.bsky.app/api/getMonitorList/zwOvMT8x16'
 *
 * which answers 200 with 441 KB of `{status, data:[{monitorId, statusClass,
 * name, ...}]}`. It is not used here, for three reasons, and the first is
 * decisive:
 *
 *  1. **It is keyed by an opaque token scraped from the page's own script.**
 *     That is the signature of an internal implementation detail of a frontend,
 *     not a published API. It can be rotated or removed without notice, and
 *     depending on it here would be exactly the kind of invented integration
 *     this pack refuses. `apps/posthog` declines an internal status route for
 *     the same reason.
 *  2. **Its monitors are per-host, and the wrong hosts.** They watch individual
 *     Bluesky PDS instances — `agaric.us-west.host.bsky.network` and hundreds of
 *     siblings. A red one says nothing about the host *this* connection's
 *     account lives on, and this check is `scope: "app"` so it cannot know
 *     which that is.
 *  3. **It says nothing at all about a self-hosted PDS**, which the AT Protocol
 *     is designed for and which a connection may well point at.
 *
 * What answers the question properly is per-connection: the `pds` check probes
 * the actual server this account lives on. That is where the signal is.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Bluesky service status",
  kind: "service",
  covers: ["*"],
  scope: "app",
  credential: "none",
  severity: "informational",
  unavailable: {
    reason:
      "status.bsky.app is an UptimeRobot page with no published API. Verified 2026-08-18: every " +
      "Statuspage-shaped path (/api/v2/summary.json, /summary.json, /index.json, /history.rss) " +
      "returns a 404 HTML page. A working JSON route exists at " +
      "/api/getMonitorList/{token}, but the token is only obtainable by scraping the page's own " +
      "`pspApiPath` JavaScript variable — an internal frontend detail, not a contract, and the " +
      "same reason apps/posthog declines its status route. Its monitors are also the wrong " +
      "granularity: they watch individual *.host.bsky.network PDS instances, so a red one says " +
      "nothing about the host a given account lives on, and nothing whatsoever about a " +
      "self-hosted PDS. The `pds` dependency check probes the actual server per connection, " +
      "which is where the answer is.",
  },
};

export default service;
