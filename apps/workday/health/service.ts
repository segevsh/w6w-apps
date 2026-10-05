import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Workday's status — a declared absence.
 *
 * Workday publishes no machine-readable status feed. Verified 2026-10-05:
 * `status.workday.com` and `trust.workday.com` both 301 to
 * `community.workday.com/trust/status`, which in turn redirects to a SAML sign-in
 * (`signin.resourcecenter.workday.com`) — the page is login-gated, and the
 * `/api/v2/summary.json`, `/index.json` and `/history.atom` paths on the status
 * host all take the same 301. Workday is also multi-tenant-by-data-centre: a
 * tenant's availability is its own, so even a public feed would not speak for it.
 * The credential check (auth:refresh-token) is the automatable signal.
 */
const service: HealthCheckDefinition = {
  key: "service",
  kind: "service",
  title: "Workday status",
  scope: "app",
  covers: ["service"],
  severity: "informational",
  unavailable: {
    reason:
      "Workday publishes no machine-readable status. Verified 2026-10-05: status.workday.com and " +
      "trust.workday.com 301 to community.workday.com/trust/status, which redirects to a SAML sign-in " +
      "(login-gated); /api/v2/summary.json, /index.json and /history.atom on the status host take the same " +
      "301. Availability is also per tenant and data center, so one public feed could not speak for a " +
      "connection. The credential check (auth:refresh-token) is the automatable signal.",
  },
};

export default service;
