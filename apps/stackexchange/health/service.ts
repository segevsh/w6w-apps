import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no machine-readable vendor status exists — a positive fact.
 *
 * Checked on 2026-10-06: `stackstatus.com` is Stack Overflow's own status page (title "Service
 * Status"). `/api/v2/summary.json`, `/index.json` and `/history.atom` answer a 404 HTML page, and
 * the only feed, `/rss`, is an Atom document titled "Stackstatus Incidents" with an empty
 * `updated` and no entries — an incident log, not a current-state indicator, and not specific to
 * the API. `status.stackexchange.com` 302s to a "site-not-found" page and `stackstatus.net` is
 * behind a Cloudflare challenge. Whether the API itself answers is the unsigned `api` check's job.
 *
 * `severity: "informational"`: otherwise the permanent `unknown` pins the app.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Stack Exchange platform status",
  kind: "service",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "stackstatus.com publishes no machine-readable status: no Statuspage summary.json or " +
      "index.json, and its only feed (/rss) is an empty incident log. The `api` check probes " +
      "the API directly.",
  },
};

export default service;
