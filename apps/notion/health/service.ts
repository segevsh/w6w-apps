import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Notion publishes nothing a machine can read, and saying so is a positive
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
  title: "Notion platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.notion.so is a human page with no JSON API or feed. The derived `auth:*` credential check is the only automatable liveness signal.",
  },
};

export default service;
