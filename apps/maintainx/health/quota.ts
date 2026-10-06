import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan / request headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason:
      "MaintainX's OpenAPI document (fetched 2026-10-06) documents no rate-limit headers; the " +
      "only limits are prose on the meter-reading endpoints (manual meters 10 requests per 24 " +
      "hours, automated/IoT 1 request per 10 seconds on the single-reading endpoint), and a live " +
      "401 carried no ratelimit or retry header. There is nothing to read headroom from, so it " +
      "is declared rather than guessed.",
  },
};

export default quota;
