import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Google Contacts up? — **nothing to probe.**
 *
 * The sibling google-* apps in this pack read Google's Workspace Status
 * Dashboard feed (`www.google.com/appsstatus/dashboard/incidents.json`) and
 * filter it to their own `service_name`. That does not work here: the
 * dashboard's own machine-readable product list
 * (`www.google.com/appsstatus/dashboard/products.json`, checked 2026-08-02)
 * enumerates 36 products — Gmail, Google Calendar, Google Drive, Google Sheets,
 * Google Docs, Google Keep, Google Tasks, Google Voice, … — and **Google
 * Contacts is not among them**. Filtering the incident feed to "Google
 * Contacts" would therefore match nothing, ever, and report a permanent,
 * meaningless `ok` — an outage the dashboard never covers would read as health.
 *
 * The plausible substitutes are worse, not better:
 *   - Widening the filter to all of Workspace makes a Meet outage fail this app.
 *   - `status.cloud.google.com` covers Google Cloud Platform products; the
 *     People API is a Workspace/Google-account API and is not listed there.
 *   - Probing `people.googleapis.com` unauthenticated only proves TLS reaches
 *     Google's front end, which stays up through a backend incident.
 *
 * So this is declared absent rather than faked. `severity: "informational"` is
 * mandatory for a declared absence — it always reports `unknown`, and without
 * it that `unknown` would pin the app's roll-up verdict there permanently.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Google Contacts platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Google publishes no status surface for Contacts or the People API. The Google Workspace Status Dashboard's product list (www.google.com/appsstatus/dashboard/products.json) does not include Google Contacts, so its incident feed can never carry a Contacts entry; status.cloud.google.com covers Google Cloud Platform, not this API. Outages surface only as 5xx from people.googleapis.com on a real call.",
  },
};

export default service;
