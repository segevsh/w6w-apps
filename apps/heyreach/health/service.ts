import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is HeyReach up? — there is a real status page, and it is not one this check
 * can read. The absence is declared, not left as a gap.
 *
 * ## What was verified, live, on 2026-09-22
 *
 * `https://status.heyreach.io` **is** HeyReach's own status page — not a decoy
 * and not an invented URL:
 *
 *  - it serves its own `<title>HeyReach Status</title>`, and `heyreach.io` is
 *    the vendor's real domain (`https://www.heyreach.io` titles itself
 *    "HeyReach | LinkedIn Automation Tool For Agencies, Sales & Growth teams");
 *  - its DNS resolves to `psp-lb2.uptimerobot.com`, i.e. the page is hosted by
 *    **UptimeRobot**, not Atlassian Statuspage — so every Statuspage-shaped
 *    path this pack relies on is gone, confirmed individually:
 *    `/api/v2/summary.json`, `/summary.json`, `/index.json`, `/history.rss`
 *    and `/feed.rss` all answer **404 with an HTML body**;
 *  - the only JSON routes are token-keyed — reading the page's own JavaScript
 *    turns up `pspApiPath = '…/api/getMonitorList/GOkg3CWwDL'` (and a matching
 *    `/api/getEventFeed/…`), which answer `{status, data:[…]}` and
 *    `{status, results:[…]}` respectively.
 *
 * ## Why the working JSON route is still not used
 *
 * Three reasons, the first decisive — the same call `apps/bluesky` makes about
 * `status.bsky.app` and `apps/apitemplateio` makes about
 * `status.apitemplateio.io`, both also UptimeRobot pages:
 *
 *  1. **It is keyed by an opaque token scraped out of the page's own script.**
 *     That is the signature of an internal frontend implementation detail, not
 *     a published API: it can be rotated or removed without notice, and
 *     depending on it would be exactly the invented integration this pack
 *     refuses.
 *  2. **Its content is one coarse heartbeat.** Read live, the monitor list is a
 *     single monitor, `PROD General Health` — an HTTP uptime probe with
 *     `statusClass: "success"`, not a per-component statement about the API
 *     this app calls. A green dot there cannot distinguish "the marketing site
 *     answers" from "the API is serving".
 *  3. **The API's own auth answer is a better probe anyway.** HeyReach has a
 *     documented endpoint that reports live whether the API accepted a key;
 *     the `api` check and the derived `auth:api-key` check (from
 *     `../auth/api-key.ts`'s `test` hook) are the automatable signal for "is
 *     HeyReach working", and they speak about the API rather than about a
 *     landing page.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in a roll-up, so at any other
 * severity this would pin the app's verdict at `unknown` forever.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "HeyReach platform status",
  description:
    "No machine-readable status surface: status.heyreach.io is real but UptimeRobot-hosted, " +
    "and its only JSON routes are keyed by a token scraped from the page itself.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      'status.heyreach.io is real (it titles itself "HeyReach Status", CNAMEd to UptimeRobot\'s ' +
      "psp-lb2.uptimerobot.com) but publishes no contract: verified live 2026-09-22 that " +
      "/api/v2/summary.json, /summary.json, /index.json, /history.rss and /feed.rss all return a " +
      "404 HTML page, and the only JSON routes (/api/getMonitorList/{token}, " +
      "/api/getEventFeed/{token}) are keyed by an opaque token scraped from the page's own " +
      "pspApiPath JavaScript variable — an internal frontend detail, which is why apps/bluesky " +
      "and apps/apitemplateio decline their UptimeRobot pages for the same reason. Its content " +
      'is also one coarse monitor, "PROD General Health", rather than a per-component API ' +
      "status. The `api` check and the derived auth:api-key check probe HeyReach's own API " +
      "instead, which is the surface a workflow actually depends on.",
  },
};

export default service;
