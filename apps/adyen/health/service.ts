import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Adyen publishes a status page but no feed or documented status API.
 *
 * Checked 2026-10-05:
 *
 *   - `status.adyen.com` is a client-rendered Nuxt single-page app ("Adyen
 *     platfom status"). `/api/v2/summary.json`, `/api/v2/components.json`,
 *     `/history.atom`, `/rss`, `/feed`, `/index.json` and a bogus path all
 *     answer the identical 41 KB HTML shell with HTTP 200 — a catch-all, not
 *     seven endpoints.
 *   - `adyen.statuspage.io/api/v2/summary.json` answers 401 (private).
 *   - The SPA's own bundle calls `/api/global-data` (page labels only) and
 *     `/api/incident-messages/active` (`{"incidentMessageCollection":{"items":[]}}`
 *     when quiet). Those are undocumented internals of the page's CMS, the item
 *     schema could not be captured while no incident was open, and they name
 *     product areas ("Payments", "Payment methods and issuers", ...) rather
 *     than the Checkout API. A check built on them could silently stop firing
 *     the day the page changes, so none is declared.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, which would otherwise pin the app's verdict there forever.
 * Reachability of the API itself is the `api` check.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Adyen platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.adyen.com is a client-rendered page with no documented JSON, Atom or RSS feed " +
      "(every feed path answers the same HTML shell), and its private Statuspage returns 401.",
  },
};

export default service;
