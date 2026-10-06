import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Aidbase publishes no status page this check can read. Checked 2026-10-06: `status.aidbase.ai`
 * does not resolve, and neither the docs site nor the API reference links one. The `api` check
 * answers "is the API serving" directly instead. `informational` keeps this absence from
 * pinning the app's verdict at `unknown`.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Aidbase platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Aidbase publishes no machine-readable status page. Verified 2026-10-06: " +
      "status.aidbase.ai does not resolve and the docs link none. The `api` check probes the " +
      "API host directly.",
  },
};

export default service;
