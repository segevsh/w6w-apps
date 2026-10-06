/**
 * Is the vendor up? — VBOUT publishes nothing machine-readable.
 *
 * `developers.vbout.com/apistatus` exists, but is an empty page: the single `<h1>API Status</h1>`
 * and no component, feed or script that fills it (checked 2026-10-06). No other status page was
 * found. So there is no feed to declare and nothing is invented; the live signals are the `api`
 * reachability check and the derived `auth:api-key` credential check.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`,
 * and `unknown` outranks `ok` in the roll-up, so at any other severity this would pin the app's
 * verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "VBOUT platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "VBOUT publishes no status page or feed (developers.vbout.com/apistatus is an empty " +
      "page). The `api` reachability check and the derived `auth:*` check are the automatable " +
      "signals.",
  },
};

export default service;
