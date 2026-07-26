import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Telegram publishes nothing a machine can read, and saying so is a positive
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
  title: "Telegram platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Telegram runs no status service for the Bot API at all — no status page, JSON endpoint or feed; outages are announced on the @telegram channel. The derived `auth:*` check (`getMe`) is the only liveness signal that exists.",
  },
};

export default service;
