import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declared absence, not a gap: no Google status feed covers the Gemini
 * Developer API. Checked live (2026-08-16):
 *
 * - `https://www.google.com/appsstatus/dashboard/incidents.json` (the Google
 *   Workspace Status Dashboard) does carry a "Gemini" component — but that is
 *   the Workspace assistant surfaced inside Gmail/Docs/Chat, a different
 *   product from the developer API this app calls. Conflating the two would
 *   report this app down (or up) for the wrong Gemini.
 * - `https://status.cloud.google.com/incidents.json` (Google Cloud Platform
 *   status) lists a "Vertex Gemini API" component — that is Vertex AI, the
 *   GCP/service-account product this app explicitly does not call (see
 *   README). No component named "Generative Language API", "Gemini Developer
 *   API", or "AI Studio" exists on either feed.
 *
 * `severity: "informational"` — an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin this App's verdict at `unknown`
 * forever.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Gemini Developer API platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Google publishes no machine-readable status feed for the Gemini Developer API " +
      '(generativelanguage.googleapis.com). The Workspace dashboard\'s "Gemini" component ' +
      'is the Workspace assistant, and Cloud\'s "Vertex Gemini API" component is Vertex AI — ' +
      "neither covers this API.",
  },
};

export default service;
