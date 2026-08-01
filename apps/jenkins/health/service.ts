import type { HealthCheckDefinition } from "@w6w/types";

/**
 * There is no single "is Jenkins up" signal this app can probe, because this
 * app targets ARBITRARY instances — a customer's own CI box, an on-prem
 * network segment, or a managed-Jenkins offering — each addressed by its own
 * `endpoint`. Jenkins the open-source project publishes no hosted status page
 * for individual installs the way a SaaS vendor does; the instance IS the
 * dependency, which is what `./site.ts` probes.
 *
 * `severity: "informational"` is load-bearing here, exactly as for `elastic`
 * and `wordpress`: an `unavailable` entry always reports `unknown`, and
 * `unknown` outranks `ok` in the roll-up, so at any other severity a declared
 * absence would pin every verdict at `unknown` forever. Informational checks
 * never worsen a verdict; they are carried for display.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Jenkins platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Jenkins is self-hosted per Connection — there is no vendor-run status page for an " +
      "arbitrary instance the way there is for a hosted SaaS. The instance's own reachability " +
      "is what the `site` check probes.",
  },
};

export default service;
