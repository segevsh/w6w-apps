import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is YouTube up? — **nothing to probe.** Checked, not assumed.
 *
 * The sibling google-* apps in this pack read Google's Workspace Status
 * Dashboard feed (`www.google.com/appsstatus/dashboard/incidents.json`) and
 * filter it to their own `service_name`. That does not work here. The
 * dashboard's own machine-readable product list
 * (`www.google.com/appsstatus/dashboard/products.json`, fetched and read
 * 2026-08-03) enumerates 36 products — Gmail, Google Calendar, Google Drive,
 * Google Docs, Google Sheets, Google Tasks, Google Chat, Google Voice, … — and
 * **YouTube is not among them.** It is a consumer product, not a Workspace one.
 * A filter on "YouTube" would therefore match nothing, ever, and report a
 * permanent, meaningless `ok`: an outage the dashboard does not cover would read
 * as health, which is worse than admitting the gap.
 *
 * The plausible substitutes are all worse:
 *   - Widening the filter to all of Workspace makes a Google Meet incident fail
 *     this app, and still misses every YouTube-only outage.
 *   - `status.cloud.google.com` is the Google Cloud Platform dashboard. The
 *     YouTube Data API is billed through a Cloud project but is not a GCP
 *     product and is not listed there.
 *   - YouTube's public-facing status presence is a support Twitter/X account
 *     (`@TeamYouTube`) — prose, no machine-readable feed, no Atom or RSS, so
 *     there is nothing to hand to `feed`.
 *   - Fetching `youtube.googleapis.com` unauthenticated only proves TLS reaches
 *     Google's front end, which stays up through a backend incident. It would
 *     report `ok` during the outage it exists to catch.
 *
 * So this is declared absent rather than faked. `severity: "informational"` is
 * mandatory for a declared absence — it always reports `unknown`, and without it
 * that `unknown` would pin the app's roll-up verdict there permanently.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "YouTube platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Google publishes no machine-readable status surface for YouTube or the YouTube Data API. The Google Workspace Status Dashboard's product list (www.google.com/appsstatus/dashboard/products.json) does not include YouTube, so its incident feed can never carry a YouTube entry; status.cloud.google.com covers Google Cloud Platform products, not this API; and @TeamYouTube publishes prose, not a feed. Outages surface only as 5xx or 503 from youtube.googleapis.com on a real call.",
  },
};

export default service;
