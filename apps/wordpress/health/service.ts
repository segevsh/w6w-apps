import type { HealthCheckDefinition } from "@w6w/types";

/**
 * WordPress publishes nothing a machine can read, and saying so is a positive
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
  title: "WordPress platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "There is no vendor to have a status page: a self-hosted WordPress site IS the dependency, which is what the `site` check probes. (WordPress.com-hosted sites are covered by status.automattic.com, itself a human page.)",
  },
};

export default service;
