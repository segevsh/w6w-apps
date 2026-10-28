import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Zendesk publishes nothing a machine can read, and saying so is a positive
 * fact rather than an omission — a host can render "not knowable" instead of
 * leaving an operator to conclude the publisher forgot.
 *
 * `severity: "informational"` is load-bearing here. An `unavailable` entry
 * always reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at
 * any other severity a declared absence would pin every verdict at `unknown`
 * forever. Informational checks never worsen a verdict; they are carried for
 * display.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Zendesk platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.zendesk.com is a human page with no JSON API or feed, and it is per-pod — an incident usually affects one pod rather than all of Zendesk, which a single rollup would erase anyway. The `account` dependency check probes this connection's own subdomain instead.",
  },
};

export default service;
