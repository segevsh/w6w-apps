import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "OnePageCRM request headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "OnePageCRM has no per-day quota and publishes no rate-limit header or usage " +
      "endpoint; the request-rate throttle (HTTP 403 text/plain `Rate Limit Exceeded`) and the " +
      "concurrent-connection limit (HTTP 429) only signal after the fact.",
  },
};

export default quota;
