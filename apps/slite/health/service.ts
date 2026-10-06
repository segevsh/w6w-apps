/**
 * Is the vendor up? — Slite has a real status page but publishes nothing a host can read.
 *
 * `status.slite.com` is real (measured 2026-10-06): a server-rendered page titled "Slite Status"
 * whose branding names Slite. But it is HTML only. `/summary.json`, `/index.json`,
 * `/api/v2/summary.json`, `/api/v2/status.json`, `/api/v2/components.json`, `/history.atom`,
 * `/history.rss`, `/feed.rss` and `/feed.json` all answer 404, and `slite.statuspage.io` is
 * the unclaimed-Statuspage decoy (it redirects to Atlassian's own marketing page, 127 KB of
 * HTML). With no feed to declare and no component to read, nothing is invented here: the live
 * signals are the `api` reachability check and the derived `auth:api-key` credential check.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other severity this would
 * pin the app's verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Slite platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Slite's status page (status.slite.com) is HTML only: every JSON, Atom and RSS " +
      "path 404s and the Statuspage-shaped alias is an unclaimed decoy. The `api` " +
      "reachability check and the derived `auth:*` check are the automatable signals.",
  },
};

export default service;
