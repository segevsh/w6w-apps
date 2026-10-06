import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no machine-readable vendor status exists — a positive fact.
 *
 * Checked on 2026-10-06: `status.acumbamail.com` is real and is Acumbamail's
 * ("Acumbamail Status", an UptimeRobot-hosted page), but it is a client-rendered
 * page with no documented feed or JSON: `/feed`, `/rss`, `/feed.rss`,
 * `/history.rss`, `/rss.xml` and `/api/getMonitorList` all answered 404, and the
 * HTML carries no component list in its markup (it loads the data by script).
 * Acumbamail's API reference links no status feed either. Scraping rendered HTML
 * is not a stable signal, so none is claimed. `acumbamail.statuspage.io` and
 * `acumbamail.instatus.com` both answer 200 with the vendor-generic landing
 * page of those products (redirect to atlassian.com / instatus.com), not a page.
 *
 * `severity: "informational"`: otherwise the permanent `unknown` pins the app.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Acumbamail platform status",
  kind: "service",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason:
      "Acumbamail's status page (status.acumbamail.com, UptimeRobot) is rendered client-side " +
      "and publishes no feed or JSON API, so there is nothing stable for the host to read.",
  },
};

export default service;
