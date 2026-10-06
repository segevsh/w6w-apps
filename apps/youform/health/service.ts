import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Youform publishes no status page. Checked 2026-10-06: `status.youform.com`
 * does not resolve, `youform.com/status` is the marketing site's 404, and
 * neither the help centre (`help.youform.com/llms.txt`) nor the Postman
 * collection names a status URL or incident feed. API reachability is reported
 * by the `api` check instead.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry reports
 * `unknown`, which would otherwise pin the app's verdict there forever.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Vendor status page",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Youform publishes no status page or incident feed: status.youform.com does not resolve, " +
      "youform.com/status is a 404, and neither the help centre nor the API collection names one. " +
      "API reachability is reported by the `api` check instead.",
  },
};

export default service;
