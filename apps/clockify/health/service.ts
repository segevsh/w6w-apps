import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Clockify up? — declared `unavailable` rather than guessed.
 *
 * Verified live (2026-08-01): `https://status.clockify.me/api/v2/summary.json`
 * (the standard Atlassian Statuspage path this pack's other apps use) returns
 * a plain 404 HTML page, not a status API. No linked status page could be
 * found from clockify.me itself. `severity: "informational"` so this can
 * never worsen a roll-up verdict on its own — it is a documented absence,
 * not a broken probe.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Clockify platform status",
  description: "No machine-readable status feed was found for Clockify as of 2026-08-01 " +
    "(status.clockify.me/api/v2/summary.json 404s), so this app declares the absence " +
    "rather than guessing at an undocumented endpoint.",
  kind: "service",
  scope: "app",
  credential: "none",
  severity: "informational",
  unavailable: {
    reason: "Clockify publishes no documented JSON/Atom/RSS status feed as of 2026-08-01.",
  },
};

export default service;
