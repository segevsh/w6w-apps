import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Wappalyzer up? Declared unavailable — no trustworthy machine-readable
 * feed was found, checked two ways on 2026-09-29.
 *
 * **`status.wappalyzer.com` is genuinely Wappalyzer's, but publishes no JSON,
 * RSS or Atom feed.** It self-identifies correctly (`<title>Wappalyzer</title>`,
 * favicon linked from `psp-logos.uptimerobot.com`, footer link back to
 * `www.wappalyzer.com`) and is a real, live "Powered Status Page" hosted on
 * UptimeRobot infrastructure — but every response is client-rendered HTML
 * (Laravel-style `XSRF-TOKEN`/`psp_session` cookies, `via: 0.0 Caddy`). Its
 * own JS bundles reference a `getMonitorList` AJAX call, but the endpoint it
 * hits is not present in the shipped bundle text — there is no static path to
 * read without executing the page's JavaScript, which this app's sandbox
 * cannot do and should not be asked to.
 *
 * **`wappalyzer.statuspage.io` exists but is not evidence of anything.**
 * `/api/v2/summary.json` answers `200` with `page.name: "Wappalyzer"`, but
 * `components: []` and `incidents: []` — every array empty — and
 * `updated_at: "2021-07-28T04:24:14.526Z"`, over five years stale. A
 * Statuspage instance that has never once carried a component or an incident
 * in five years is not a live status surface; it reads like an abandoned
 * setup superseded by the UptimeRobot page above, not a source to trust for
 * "is the API up right now."
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, which outranks `ok` in the roll-up, so any other
 * severity would pin this App's health at `unknown` forever.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Wappalyzer platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Wappalyzer publishes no readable status feed for this API. status.wappalyzer.com is a " +
      "genuine, currently-maintained UptimeRobot-hosted status page for the product, but every " +
      "response is client-rendered HTML with no discoverable JSON/RSS/Atom endpoint. A separate " +
      "wappalyzer.statuspage.io page exists and answers 200, but its components and incidents " +
      "arrays have been empty since it was last updated in July 2021 — an abandoned instance, " +
      "not a live signal.",
  },
};

export default service;
