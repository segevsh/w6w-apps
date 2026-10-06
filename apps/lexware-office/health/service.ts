/**
 * Is the vendor up? — Lexware publishes no usable status page, and saying so is a positive fact.
 *
 * `status.lexware.de` answers `406` to every probe (measured 2026-10-06), so there is no
 * feed to declare and no component to read. The reference only says "Stay informed about the
 * system status" without a machine-readable source. The live signals are the unsigned `api`
 * reachability check and the derived `auth:api-key` credential check.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports
 * `unknown`, which would otherwise pin the app's verdict there forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Lexware platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Lexware publishes no machine-readable status page: status.lexware.de answers " +
      "HTTP 406 to every request. The `api` reachability check and the derived `auth:*` " +
      "check are the automatable signals.",
  },
};

export default service;
