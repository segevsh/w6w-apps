import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declared absence, not a gap: Google's incident feeds do not cover this
 * product. Checked live (2026-08-15):
 *
 * - `https://www.google.com/appsstatus/dashboard/incidents.json` (the Google
 *   Workspace Status Dashboard, used by this pack's other `google-*` apps) —
 *   its `service_name` values are Workspace-branded products (Gmail, Google
 *   Calendar, Google Docs, Google Drive, Google Chat, Google Meet, …). No
 *   entry names "Business Profile" or "My Business" — the product isn't part
 *   of Workspace.
 * - `https://status.cloud.google.com/incidents.json` — Google Cloud
 *   Platform infrastructure incidents; none mention Business Profile either.
 *
 * `severity: "informational"` — an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin this App's verdict at `unknown`
 * forever.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Business Profile platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Google publishes no machine-readable status feed for the Business Profile APIs. The Google Workspace Status Dashboard (used by this pack's other google-* apps) does not list Business Profile as a component, and Google Cloud's status feed covers infrastructure, not this product.",
  },
};

export default service;
