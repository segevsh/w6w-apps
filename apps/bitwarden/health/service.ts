import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Bitwarden's status page — a declared absence.
 *
 * `status.bitwarden.com` is real (a Hund-hosted page whose components include
 * "US RESTful API", "US Identity Service", "EU RESTful API" and "EU Identity
 * Service"), so the vendor does cover the API. But nothing on it is
 * machine-readable. Verified 2026-10-05: `/api/v2/summary.json`, `/api/v2/status.json`,
 * `/index.json`, `/history.atom`, `/history.rss` all answer 404 or 406 (the 404 is
 * an HTML page, not a status document); `/api/v1/components.json` answers `401
 * not_authenticated` — Hund's API needs the page owner's key. Scraping the HTML
 * tiles would be inferring a state, so this declares the absence.
 */
const service: HealthCheckDefinition = {
  key: "service",
  kind: "service",
  title: "Bitwarden status",
  scope: "app",
  covers: ["service"],
  severity: "informational",
  unavailable: {
    reason:
      "status.bitwarden.com is a real Hund-hosted page with US/EU 'RESTful API' and 'Identity " +
      "Service' components, but it publishes no machine-readable feed. Verified 2026-10-05: " +
      "/api/v2/summary.json, /api/v2/status.json, /index.json 404; /history.atom, /history.rss " +
      "and /history.json 406; /api/v1/components.json 401 (an API key is required). The " +
      "credential check (auth:client-credentials) is the automatable signal.",
  },
};

export default service;
