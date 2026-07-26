import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Mailchimp publishes nothing a machine can read, and saying so is a positive
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
  title: "Mailchimp platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.mailchimp.com is a human page with no JSON API or feed. `GET /3.0/ping` — which the auth `test` hook already calls — is the automatable signal.",
  },
};

export default service;
