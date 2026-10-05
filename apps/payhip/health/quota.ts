import type { HealthCheckDefinition } from "@w6w/types";

/** Quota headroom — declared as an absence: the license docs state no limit and no headers. */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Payhip's license-key docs publish no rate limit and no quota or rate-limit " +
      "response headers, so there is no headroom to read.",
  },
};

export default quota;
