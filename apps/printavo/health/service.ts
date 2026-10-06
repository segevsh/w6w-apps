import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Printavo publishes no status page that a check can poll. Checked 2026-10-06:
 * `status.printavo.com` is not a status page — `/` and `/index.json` answer a hosting
 * provider's "Unknown Domain" 404 page, `/api/v2/summary.json` and `/history.atom` answer
 * Printavo's marketing 404 page. The vendor's reference lists no status URL either.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Printavo platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Printavo publishes no machine-readable status page: status.printavo.com is an " +
      "unconfigured host (a hosting provider's Unknown Domain 404) and the Statuspage/Better " +
      "Stack/Atom paths all 404. The credential check (auth:credentials) is the only live signal.",
  },
};

export default service;
