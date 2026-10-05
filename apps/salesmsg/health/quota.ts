import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Salesmsg documents a global limit of 60 requests per minute (HTTP 429 for the next 60 " +
      "seconds once exceeded) but publishes no usage endpoint, and no RateLimit-* or " +
      "X-RateLimit-* header appeared on the live api.salesmessage.com responses read on " +
      "2026-10-05. Credit balance is reported on GET /organization/current (`account_credits`), " +
      "but the document does not say what an exhausted balance does to an API call, so it is " +
      "not read as quota.",
  },
};

export default quota;
