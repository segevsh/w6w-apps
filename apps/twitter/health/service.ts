import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is X's platform up? — declared `unavailable` rather than faked.
 *
 * X's developer status page (developer.x.com/status, formerly
 * api.twitterstat.us) is a human-readable dashboard. Unlike GitHub's
 * Atlassian-Statuspage-backed `www.githubstatus.com` (JSON `summary.json`) or
 * a vendor publishing Atom/RSS, it has no documented public API, JSON
 * endpoint, or feed this app could poll — attempts to reach one during
 * research (2026-07-31) turned up no such resource, only the dashboard
 * itself and its developer-community discussion threads reporting the page
 * has been unreliable.
 *
 * Per rfcs/healthcheck.md, "say so when a vendor publishes nothing" beats
 * guessing at an undocumented endpoint that could change or disappear
 * without notice. `severity: "informational"` so this can never worsen a
 * roll-up verdict on its own — it is a documented absence, not a broken probe.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "X platform status",
  description:
    "No machine-readable status feed is documented for the X Developer Platform (developer.x.com/status is a human-readable dashboard only), so this app declares the absence rather than guessing at an undocumented endpoint.",
  kind: "service",
  scope: "app",
  credential: "none",
  severity: "informational",
  unavailable: {
    reason:
      "X publishes no documented JSON/Atom/RSS status feed as of 2026-07-31; developer.x.com/status is dashboard-only.",
  },
};

export default service;
