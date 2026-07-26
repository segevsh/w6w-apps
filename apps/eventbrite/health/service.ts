import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Eventbrite publishes nothing a machine can read, and saying so is a positive
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
  title: "Eventbrite platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Eventbrite runs a human status page at status.eventbrite.com with no JSON API or feed behind it. The derived `auth:*` credential check and the `quota` check are the only automatable signals.",
  },
};

export default service;
