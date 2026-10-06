import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Vendor status: unavailable. Verified 2026-10-06: the docs, llms.txt and formbricks.com
 * link no status page. `status.formbricks.com` answers 526 (invalid origin certificate),
 * and `formbricks.instatus.com` / `formbricks.statuspage.io` redirect to the providers'
 * own marketing pages (unclaimed).
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Formbricks publishes no machine-readable status page: status.formbricks.com answers 526 " +
      "and the Instatus/Statuspage names are unclaimed. Reachability is covered by the `api` " +
      "check, credential liveness by the derived auth:api-key check, and request headroom by " +
      "the `quota` check.",
  },
};

export default service;
