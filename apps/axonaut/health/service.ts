/**
 * Is the vendor up? — Axonaut publishes no status page.
 *
 * No status page was found for Axonaut (checked 2026-10-06; the product site, the API
 * documentation and the help centre link to none), so there is no feed to declare and no JSON
 * to parse and nothing is invented. The live signals are the `api` reachability check and the
 * derived `auth:api-key` credential check.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`,
 * and `unknown` outranks `ok` in the roll-up, so at any other severity this would pin the app's
 * verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Axonaut platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Axonaut publishes no status page or feed. The `api` reachability check and the " +
      "derived `auth:*` check are the automatable signals.",
  },
};

export default service;
