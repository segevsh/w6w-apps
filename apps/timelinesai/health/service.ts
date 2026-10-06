import type { HealthCheckDefinition } from "@w6w/types";

/**
 * TimelinesAI publishes no status page this check can read. Checked 2026-10-06:
 * `status.timelines.ai` does not resolve; `timelinesai.statuspage.io` answers a 127,718-byte
 * HTML body, the same size as every other unclaimed-Statuspage decoy (it is not a page with a
 * `page.name` and a summary feed); and neither the docs nor the marketing site link a status
 * page. The `api` check answers "is the API serving" directly instead. `informational` keeps this
 * absence from pinning the app's verdict at `unknown`.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "TimelinesAI platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "TimelinesAI publishes no machine-readable status page. Verified 2026-10-06: " +
      "status.timelines.ai does not resolve and timelinesai.statuspage.io is the unclaimed " +
      "Statuspage decoy. The `api` check probes the API host directly.",
  },
};

export default service;
