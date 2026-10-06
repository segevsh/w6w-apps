/**
 * Is the vendor up? — PrintNode publishes no machine-readable status page.
 *
 * Checked 2026-10-06: `status.printnode.com` does not resolve; `printnode.statuspage.io`
 * 302s to statuspage.io's marketing site (an unclaimed page); the API reference and the product
 * site link to no status page. Nothing is invented. The live signals are the `api` reachability
 * check (`GET /ping`) and the derived `auth:api-key` credential check.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`,
 * and `unknown` outranks `ok` in the roll-up, so at any other severity this would pin the app's
 * verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "PrintNode platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "PrintNode publishes no status page or feed. The `api` reachability check " +
      "(`GET /ping`) and the derived `auth:*` check are the automatable signals.",
  },
};

export default service;
