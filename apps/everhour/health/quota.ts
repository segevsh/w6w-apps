import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Everhour documents "around 20 requests per 10 seconds per API key", explicitly not
 * guaranteed, and a `429` with `Retry-After` once exceeded. It documents no rate-limit headers
 * and no usage endpoint, so headroom is not observable before it runs out.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Everhour documents ~20 requests per 10 seconds per key (not guaranteed) but " +
      "exposes no rate-limit headers and no usage endpoint; headroom only shows up as a 429 " +
      "with Retry-After after it has been exceeded.",
  },
};

export default quota;
