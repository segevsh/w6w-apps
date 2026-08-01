import type { HealthCheckDefinition } from "@w6w/types";

/**
 * There is no single "is Elasticsearch up" signal this app can probe, because
 * this app targets ARBITRARY clusters — self-hosted, on-prem, or Elastic
 * Cloud — each addressed by its own `endpoint`. Elastic Cloud does publish a
 * status page (status.elastic.co), but it covers Elastic's own hosting
 * infrastructure, not a given customer's deployment, and this app has no way
 * to know which deployment model a Connection points at. The tenant's own
 * cluster reachability — which IS knowable — is what `./site.ts` probes.
 *
 * `severity: "informational"` is load-bearing here. An `unavailable` entry
 * always reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at
 * any other severity a declared absence would pin every verdict at `unknown`
 * forever. Informational checks never worsen a verdict; they are carried for
 * display.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Elasticsearch platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "There is no vendor status page for an arbitrary self-hosted/on-prem cluster: the " +
      "cluster IS the dependency, which is what the `site` check probes. Elastic Cloud " +
      "publishes status.elastic.co, but that covers Elastic's hosting infrastructure, not " +
      "a specific customer deployment, and this app cannot tell which model a Connection uses.",
  },
};

export default service;
