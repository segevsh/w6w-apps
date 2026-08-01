import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Freshdesk's status page (updates.freshdesk.com, Freshstatus-hosted) exposes
 * only an HTML incident history — no JSON API and no Atom/RSS feed. Verified:
 * `/history.atom` and `/api/v2/status` both 404. Declaring the absence is a
 * positive fact rather than an omission — a host can render "not knowable"
 * instead of leaving an operator to conclude the publisher forgot.
 *
 * `severity: "informational"` is load-bearing here. An `unavailable` entry
 * always reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at
 * any other severity a declared absence would pin every verdict at `unknown`
 * forever. Informational checks never worsen a verdict; they are carried for
 * display.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Freshdesk platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "updates.freshdesk.com is a human incident-history page with no JSON API or feed (/history.atom and /api/v2/status both 404). The `domain` dependency check probes this connection's own account host instead.",
  },
};

export default service;
