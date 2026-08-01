import type { HealthCheckDefinition } from "@w6w/types";

/**
 * There is no single "is Strapi up" signal this app can probe, because this
 * app targets ARBITRARY instances — self-hosted, on-prem, or Strapi Cloud —
 * each addressed by its own `endpoint`. Strapi (the company) does publish a
 * status page for its own Cloud/SaaS infrastructure, but this app has no way
 * to know which deployment model a given Connection points at, and a status
 * page for Strapi's hosting says nothing about a self-hosted instance running
 * on a customer's own infrastructure. The tenant's own instance
 * reachability — which IS knowable — is what `./site.ts` probes.
 *
 * `severity: "informational"` is load-bearing here. An `unavailable` entry
 * always reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at
 * any other severity a declared absence would pin every verdict at `unknown`
 * forever. Informational checks never worsen a verdict; they are carried for
 * display.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Strapi platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "There is no vendor status page for an arbitrary self-hosted/on-prem Strapi " +
      "instance: the instance IS the dependency, which is what the `site` check probes. This " +
      "app cannot tell whether a given Connection points at Strapi Cloud or a self-hosted " +
      "deployment, so even a Strapi-hosting status page would not reliably answer the question.",
  },
};

export default service;
