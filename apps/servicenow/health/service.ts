import type { HealthCheckDefinition } from "@w6w/types";

/**
 * ServiceNow publishes no platform-wide status a machine can read, and saying
 * so is a positive fact rather than an omission — a host can render "not
 * knowable" instead of leaving an operator to conclude the publisher forgot.
 *
 * Unlike a single-tenant SaaS, ServiceNow is one customer instance per
 * `<instance>.service-now.com` host: there is no shared "is ServiceNow up"
 * question to answer, only "is THIS instance up" — which is exactly what the
 * `instance` dependency check below answers instead.
 *
 * `severity: "informational"` is load-bearing here. An `unavailable` entry
 * always reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at
 * any other severity a declared absence would pin every verdict at `unknown`
 * forever. Informational checks never worsen a verdict; they are carried for
 * display.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "ServiceNow platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "ServiceNow has no single shared platform — each customer runs on its own instance (`<instance>.service-now.com`), and no public JSON API or feed reports status across instances. The `instance` dependency check probes this connection's own instance instead.",
  },
};

export default service;
