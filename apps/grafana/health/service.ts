import type { HealthCheckDefinition } from "@w6w/types";

/**
 * There is no single "is Grafana up" signal this app can probe, because this
 * app targets ARBITRARY instances — self-hosted, on-prem, or Grafana Cloud —
 * each addressed by its own `endpoint`. Grafana Labs does publish a status
 * page for its own hosted infrastructure (status.grafana.com), but it covers
 * Grafana Labs' hosting, not a given customer's instance, and this app has
 * no way to know which deployment model a Connection points at. The
 * tenant's own instance reachability — which IS knowable — is what
 * `./site.ts` probes.
 *
 * `severity: "informational"` is load-bearing here. An `unavailable` entry
 * always reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at
 * any other severity a declared absence would pin every verdict at `unknown`
 * forever. Informational checks never worsen a verdict; they are carried for
 * display.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Grafana platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "There is no vendor status page for an arbitrary self-hosted/on-prem Grafana " +
      "instance: the instance IS the dependency, which is what the `site` check probes. " +
      "Grafana Labs publishes status.grafana.com, but that covers Grafana Labs' own hosting " +
      "infrastructure, not a specific customer's instance, and this app cannot tell which " +
      "deployment model a Connection uses.",
  },
};

export default service;
