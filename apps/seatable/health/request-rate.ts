import type { HealthCheckDefinition } from "@w6w/types";

const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "API request headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "SeaTable Cloud limits base calls to 200/minute per base and applies a monthly API limit " +
      "that depends on the plan and team size. The per-minute count is only visible as " +
      "x-ratelimit-limit/-remaining/-reset headers on /api-gateway responses (an exceeded " +
      "limit is a bare 429); no documented endpoint reports the monthly allowance, and a " +
      "probe would spend the very quota it measures.",
  },
};

export default requestRate;
