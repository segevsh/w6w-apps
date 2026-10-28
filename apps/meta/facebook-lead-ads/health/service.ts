import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Meta publishes nothing a machine can read, and saying so is a positive
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
  title: "Meta platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Meta's status site (metastatus.com, and the developer view at developers.facebook.com/status/dashboard) is a human page with no JSON API or feed. The `quota` check reading `X-App-Usage` is the closest automatable proxy for platform health.",
  },
};

export default service;
