import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is the vendor's platform up? — declared absent, deliberately, after
 * checking directly rather than assuming a monitoring vendor must have one.
 *
 * `status.uptimerobot.com` exists, but it is not a vendor status page in the
 * Atlassian-Statuspage sense: it sets a `psp_session` cookie and is UptimeRobot
 * dogfooding its own "Public Status Page" product (the same one this app's
 * `newPSP`-family endpoints would create for a *customer's* monitors), not an
 * incident feed for UptimeRobot's own infrastructure. Checked directly
 * (2026-08-01):
 *
 * - `GET https://status.uptimerobot.com/` returns 200 but is a client-rendered
 *   SPA shell ("There was an error while fetching the data" without JS).
 * - `GET https://status.uptimerobot.com/api/v2/summary.json` — the standard
 *   Statuspage path other apps in this pack use (see Toggl) — 301-redirects
 *   to `uptimerobot.com`'s marketing site and 404s there. Not a status API.
 * - `/history.atom`, `/history.rss`, `/rss`, `/feed` all 404.
 *
 * No JSON status API and no Atom/RSS feed could be found, so this is declared
 * `unavailable` rather than wired to a URL that only coincidentally responds.
 * There is some irony in a monitoring vendor publishing no machine-readable
 * status surface of its own — but an honest absence is the point of this
 * field, not a workaround for it.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "UptimeRobot platform status",
  kind: "service",
  covers: ["*"],
  unavailable: {
    reason: "UptimeRobot publishes no JSON status API or Atom/RSS feed for its own platform. " +
      "status.uptimerobot.com is UptimeRobot's own Public Status Page product, dogfooded for " +
      "itself, not a machine-readable incident feed — it serves an HTML SPA shell with no " +
      "status.json/history.atom/history.rss found at the conventional paths (checked directly).",
  },
};

export default service;
