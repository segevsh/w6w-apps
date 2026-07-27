import type { HealthCheckDefinition } from "@w6w/types";

/**
 * WooCommerce is software the tenant self-hosts on their own WordPress site —
 * there is no vendor platform with a status page a machine could read. Saying
 * so is a positive fact rather than an omission: a host can render "not
 * knowable" instead of leaving an operator to conclude the publisher forgot.
 *
 * `severity: "informational"` is load-bearing here. An `unavailable` entry
 * always reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at
 * any other severity a declared absence would pin every verdict at `unknown`
 * forever. Informational checks never worsen a verdict; they are carried for
 * display. The store's actual reachability is what the `site` check probes.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "WooCommerce platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "There is no vendor to have a status page: a self-hosted WooCommerce store IS the dependency, which is what the `site` check probes.",
  },
};

export default service;
