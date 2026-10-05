import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Payhip up? — declared as an absence.
 *
 * Neither license-key article (317, 114) names a status page, and no machine-readable status
 * feed was found for Payhip. `severity: "informational"` is load-bearing: an `unavailable`
 * entry always reports `unknown`, which would otherwise pin the app there.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Payhip's help center documents no status page or feed for the license API, so " +
      "there is nothing to probe. Reachability is covered by the derived auth check, which " +
      "verifies a key that cannot exist.",
  },
};

export default service;
