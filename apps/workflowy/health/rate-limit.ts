import type { HealthCheckDefinition } from "@w6w/types";

const rateLimit: HealthCheckDefinition = {
  key: "rate-limit",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "WorkFlowy publishes no quota or remaining-request count. The API reference documents a " +
      "single limit — GET /api/v1/nodes-export allows 1 request per minute — and no rate-limit " +
      "response headers were observed on a live response. The only signal is the error itself.",
  },
};

export default rateLimit;
